import { getSupabaseAdmin } from "../lib/supabase.js";
import { wooGet } from "../lib/woo.js";
import { json, requireAdminSecret, pickSubscriptionEmail, pickSubscriptionName, safeNum } from "../lib/utils.js";

function mapSubscriptionToRow(sub, latestOrder) {
  const email = pickSubscriptionEmail(sub);
  const subscriptionId = safeNum(sub?.id);
  const adminUrl = subscriptionId
    ? `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${subscriptionId}&action=edit`
    : null;
  const name = pickSubscriptionName(sub);

  let latestOrderAdminUrl = null;
  let latestOrderStatus = null;
  let latestOrderDateIso = null;
  let latestOrderId = null;
  
  if (latestOrder && latestOrder.id) {
      latestOrderId = latestOrder.id;
      latestOrderAdminUrl = `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${latestOrder.id}&action=edit`;
      latestOrderStatus = (latestOrder.status || "").toString() || null;
      latestOrderDateIso = (latestOrder.date_created_gmt || latestOrder.date_created || "").toString() || null;
  }
  
  // Fallback: If we still have no date, use the subscription's last payment date or start date
  if (!latestOrderDateIso) {
      latestOrderDateIso = (sub?.last_payment_date_gmt || sub?.last_payment_date || sub?.date_created_gmt || sub?.date_created || "").toString() || null;
  }

  const row = {
    email,
    subscription_id: subscriptionId,
    subscription_admin_url: adminUrl,
    subscription_status: (sub?.status || "").toString() || null,
    start_date_iso: (sub?.start_date_gmt || sub?.start_date || "").toString() || null,
    next_payment_iso: (sub?.next_payment_date_gmt || sub?.next_payment_date || "").toString() || null,
    payment_method: (sub?.payment_method_title || sub?.payment_method || "").toString() || null,
    order_total: safeNum(sub?.total),
    
    // Merged Order Data
    latest_order_id: latestOrderId,
    latest_order_admin_url: latestOrderAdminUrl,
    latest_order_status: latestOrderStatus,
    latest_order_date_iso: latestOrderDateIso,
    
    sync_status: "ready",
    last_synced_at: new Date().toISOString()
  };

  if (name) row.full_name = name;
  return row;
}

function dedupeRowsByEmailKeepHighestSubscriptionId(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r?.email) continue;
    const prev = map.get(r.email);
    const a = r.subscription_id ?? 0;
    const b = prev?.subscription_id ?? 0;
    if (!prev || a > b) map.set(r.email, r);
  }
  return Array.from(map.values());
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method Not Allowed" });

    requireAdminSecret(req);

    // Parse 'page' query param for manual pagination/resume capability
    // Example: ?page=5 to start from page 5
    const url = new URL(req.url, "http://localhost");
    const startPage = parseInt(url.searchParams.get("page") || "1");

    const supabase = getSupabaseAdmin();
    // Reduced batch size to accommodate individual order lookups without timeout
    const perPage = 10; 
    let page = startPage;
    let totalUpserted = 0;
    
    while (true) {
      // 1. Fetch Subscriptions
      const subs = await wooGet(`/wp-json/wc/v3/subscriptions?per_page=${perPage}&page=${page}`);
      if (!Array.isArray(subs) || subs.length === 0) break;

      // 2. Fetch Latest Order for each Customer (Enrichment)
      // We map each sub to a promise that fetches the latest order for its customer_id
      const enrichedSubs = await Promise.all(subs.map(async (sub) => {
          if (!sub.customer_id) return sub;
          
          try {
              const customerOrders = await wooGet(`/wp-json/wc/v3/orders?customer=${sub.customer_id}&per_page=1`);
              if (Array.isArray(customerOrders) && customerOrders.length > 0) {
                  sub._latest_order_fetched = customerOrders[0];
              }
          } catch (err) {
              console.error(`Failed to fetch latest order for customer ${sub.customer_id}:`, err.message);
          }
          return sub;
      }));

      // 3. Map & Merge Data
      const rows = [];
      for (const sub of enrichedSubs) {
        const row = mapSubscriptionToRow(sub, sub._latest_order_fetched);
        if (!row.email || !row.email.includes("@")) continue;
        rows.push(row);
      }

      // 4. Dedupe & Upsert
      const deduped = dedupeRowsByEmailKeepHighestSubscriptionId(rows);

      if (deduped.length > 0) {
        const { error } = await supabase
          .from("woo_subscription_snapshot")
          .upsert(deduped, { onConflict: "email" });

        if (error) return json(res, 500, { ok: false, error: "Supabase upsert failed", details: error.message });
        totalUpserted += deduped.length;
      }

      // If user specified a specific start page, we stop after 1 batch
      if (url.searchParams.has("page")) {
          return json(res, 200, { ok: true, totalUpserted, pageProcessed: page, next: subs.length === perPage ? page + 1 : null });
      }

      page += 1;
      if (subs.length < perPage) break;
    }
    
    return json(res, 200, { ok: true, totalUpserted, pagesProcessed: page });
  } catch (e) {
    return json(res, e.statusCode || 500, { ok: false, error: e.message || "Server error", details: e.details || null });
  }
}
