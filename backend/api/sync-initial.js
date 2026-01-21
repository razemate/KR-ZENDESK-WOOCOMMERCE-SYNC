import { getSupabaseAdmin } from "../lib/supabase.js";
import { wooGet } from "../lib/woo.js";
import { json, requireAdminSecret, pickSubscriptionEmail, pickSubscriptionName, safeNum } from "../lib/utils.js";

// Extracts the latest order ID from the subscription object (related_orders)
function getLatestOrderIdFromSub(sub) {
    let candidates = [];
    
    // 1. Try related_orders structure
    if (sub?.related_orders) {
        if (Array.isArray(sub.related_orders.renewal)) {
            candidates.push(...sub.related_orders.renewal);
        }
        if (sub.related_orders.parent) {
            candidates.push(sub.related_orders.parent);
        }
    }
    
    // 2. Try direct parent_id
    if (sub?.parent_id) {
        candidates.push(sub.parent_id);
    }
    
    // Filter valid numbers and sort descending (newest ID first)
    candidates = candidates.map(safeNum).filter(n => n !== null).sort((a, b) => b - a);
    
    return candidates.length > 0 ? candidates[0] : null;
}

function mapSubscriptionToRow(sub, orderMap = new Map()) {
  const email = pickSubscriptionEmail(sub);
  const subscriptionId = safeNum(sub?.id);
  const adminUrl = subscriptionId
    ? `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${subscriptionId}&action=edit`
    : null;
  const name = pickSubscriptionName(sub);

  // Find linked latest order data
  const latestOrderId = getLatestOrderIdFromSub(sub);
  const latestOrder = latestOrderId ? orderMap.get(latestOrderId) : null;
  
  let latestOrderAdminUrl = null;
  let latestOrderStatus = null;
  let latestOrderDateIso = null;
  
  if (latestOrder) {
      latestOrderAdminUrl = `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${latestOrder.id}&action=edit`;
      latestOrderStatus = (latestOrder.status || "").toString() || null;
      latestOrderDateIso = (latestOrder.date_created_gmt || latestOrder.date_created || "").toString() || null;
  } else if (latestOrderId) {
      // We have an ID but failed to fetch the order object (maybe trashed or API missed it)
      latestOrderAdminUrl = `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${latestOrderId}&action=edit`;
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
    const perPage = 50; 
    let page = startPage;
    let totalUpserted = 0;
    
    while (true) {
      // 1. Fetch Subscriptions
      const subs = await wooGet(`/wp-json/wc/v3/subscriptions?per_page=${perPage}&page=${page}`);
      if (!Array.isArray(subs) || subs.length === 0) break;

      // 2. Collect Latest Order IDs
      const orderIdsToFetch = new Set();
      for (const sub of subs) {
          const id = getLatestOrderIdFromSub(sub);
          if (id) orderIdsToFetch.add(id);
      }

      // 3. Batch Fetch Orders
      const orderMap = new Map();
      if (orderIdsToFetch.size > 0) {
          const idsArray = Array.from(orderIdsToFetch);
          const idString = idsArray.join(",");
          
          try {
              const orders = await wooGet(`/wp-json/wc/v3/orders?include=${idString}&per_page=100`);
              if (Array.isArray(orders)) {
                  for (const o of orders) {
                      orderMap.set(o.id, o);
                  }
              }
          } catch (err) {
              console.error("Failed to fetch related orders:", err.message);
          }
      }

      // 4. Map & Merge Data
      const rows = [];
      for (const sub of subs) {
        const row = mapSubscriptionToRow(sub, orderMap);
        if (!row.email || !row.email.includes("@")) continue;
        rows.push(row);
      }

      // 5. Dedupe & Upsert
      const deduped = dedupeRowsByEmailKeepHighestSubscriptionId(rows);

      if (deduped.length > 0) {
        const { error } = await supabase
          .from("woo_subscription_snapshot")
          .upsert(deduped, { onConflict: "email" });

        if (error) return json(res, 500, { ok: false, error: "Supabase upsert failed", details: error.message });
        totalUpserted += deduped.length;
      }

      // If user specified a specific start page, we stop after 1 batch to be safe against timeouts
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
