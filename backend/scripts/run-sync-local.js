import 'dotenv/config';
import { getSupabaseAdmin } from "../lib/supabase.js";
import { wooGet } from "../lib/woo.js";
import { pickSubscriptionEmail, pickSubscriptionName, safeNum } from "../lib/utils.js";

console.log("Environment Check:");
console.log("SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("WOO_BASE_URL exists:", !!process.env.WOO_BASE_URL);

// Re-implementing mapSubscriptionToRow from sync-initial.js to run locally
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

async function runSync() {
  console.log("Starting background sync...");
  const supabase = getSupabaseAdmin();
  const perPage = 10; 
  let page = 1;
  let totalUpserted = 0;
  
  while (true) {
    console.log(`Fetching subscriptions page ${page}...`);
    const subs = await wooGet(`/wp-json/wc/v3/subscriptions?per_page=${perPage}&page=${page}`);
    if (!Array.isArray(subs) || subs.length === 0) break;

    console.log(`  Enriching ${subs.length} subscriptions with latest orders...`);
    const enrichedSubs = await Promise.all(subs.map(async (sub) => {
        if (!sub.customer_id) return sub;
        try {
            const customerOrders = await wooGet(`/wp-json/wc/v3/orders?customer=${sub.customer_id}&per_page=1`);
            if (Array.isArray(customerOrders) && customerOrders.length > 0) {
                sub._latest_order_fetched = customerOrders[0];
            }
        } catch (err) {
            console.error(`  Failed to fetch order for customer ${sub.customer_id}:`, err.message);
        }
        return sub;
    }));

    const rows = [];
    for (const sub of enrichedSubs) {
      const row = mapSubscriptionToRow(sub, sub._latest_order_fetched);
      if (!row.email || !row.email.includes("@")) continue;
      rows.push(row);
    }

    const deduped = dedupeRowsByEmailKeepHighestSubscriptionId(rows);

    if (deduped.length > 0) {
      console.log(`  Upserting ${deduped.length} records to Supabase...`);
      const { error } = await supabase
        .from("woo_subscription_snapshot")
        .upsert(deduped, { onConflict: "email" });

      if (error) {
        console.error("  Supabase upsert failed:", error.message);
      } else {
        totalUpserted += deduped.length;
      }
    }

    page += 1;
    if (subs.length < perPage) break;
  }
  
  console.log(`Sync complete. Total records upserted: ${totalUpserted}`);
}

runSync().catch(console.error);
