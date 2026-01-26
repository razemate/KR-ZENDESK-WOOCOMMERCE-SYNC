import { getSupabaseAdmin } from "../lib/supabase.js";
import { wooGet } from "../lib/woo.js";
import { json, getEmailFromReq, pickSubscriptionEmail, pickSubscriptionName, safeNum } from "../lib/utils.js";

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

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { ok: false, error: "Method Not Allowed" });

    const email = getEmailFromReq(req);
    if (!email || !email.includes("@")) return json(res, 400, { ok: false, error: "Missing or invalid email" });

    const supabase = getSupabaseAdmin();

    // 1. Fetch Customer ID from WooCommerce by Email
    const customers = await wooGet(`/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`);
    if (!Array.isArray(customers) || customers.length === 0) {
        // No customer found in Woo
        // We should clear the record in Supabase or mark as not found? 
        // For now, let's just return not found.
        return json(res, 200, { ok: true, found: false, email });
    }
    
    const customer = customers[0];
    const customerId = customer.id;

    // 2. Fetch Latest Order
    let latestOrder = null;
    try {
        const customerOrders = await wooGet(`/wp-json/wc/v3/orders?customer=${customerId}&per_page=1`);
        if (Array.isArray(customerOrders) && customerOrders.length > 0) {
            latestOrder = customerOrders[0];
        }
    } catch (err) {
        console.error(`Failed to fetch latest order for customer ${customerId}:`, err.message);
    }

    // 3. Fetch Subscription (if any)
    let subscription = null;
    try {
        const subs = await wooGet(`/wp-json/wc/v3/subscriptions?customer=${customerId}&per_page=1`);
        if (Array.isArray(subs) && subs.length > 0) {
            subscription = subs[0];
        }
    } catch (err) {
        console.error(`Failed to fetch subscription for customer ${customerId}:`, err.message);
    }

    if (!subscription && !latestOrder) {
        return json(res, 200, { ok: true, found: false, email });
    }

    // 4. Construct Row
    // If no subscription, we might still want to show latest order?
    // The current UI assumes subscription data drives the view.
    // If we have an order but no subscription, we can construct a partial row.
    
    const row = mapSubscriptionToRow(subscription || { email, id: null }, latestOrder);
    
    // 5. Upsert to Supabase
    const { error } = await supabase
      .from("woo_subscription_snapshot")
      .upsert(row, { onConflict: "email" });

    if (error) return json(res, 500, { ok: false, error: "Supabase upsert failed", details: error.message });

    return json(res, 200, { ok: true, found: true, email, record: row });

  } catch (e) {
    return json(res, e.statusCode || 500, { ok: false, error: e.message || "Server error" });
  }
}
