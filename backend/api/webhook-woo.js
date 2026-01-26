import crypto from "crypto";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { wooGet } from "../lib/woo.js";
import { json, pickSubscriptionEmail, pickSubscriptionName, safeNum } from "../lib/utils.js";

// Helper to calculate HMAC signature
function verifyWooSignatureBestEffort(req, bodyObj) {
  const secret = process.env.WOO_WEBHOOK_SECRET;
  if (!secret) return { verified: false, reason: "Missing env var: WOO_WEBHOOK_SECRET" };

  const sig = (req.headers["x-wc-webhook-signature"] || req.headers["X-WC-Webhook-Signature"] || "").toString().trim();
  if (!sig) return { verified: false, reason: "Missing X-WC-Webhook-Signature header" };

  // Best-effort: Vercel gives parsed body; we re-stringify (may differ from original formatting).
  const raw = JSON.stringify(bodyObj ?? {});
  const hmac = crypto.createHmac("sha256", secret).update(raw, "utf8").digest("base64");

  return { verified: hmac === sig, reason: hmac === sig ? "ok" : "mismatch" };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method Not Allowed" });

    const payload = req.body;
    const email = pickSubscriptionEmail(payload);
    if (!email || !email.includes("@")) return json(res, 400, { ok: false, error: "Webhook payload missing billing email" });

    const sigCheck = verifyWooSignatureBestEffort(req, payload);
    const topic = (req.headers["x-wc-webhook-topic"] || req.headers["X-WC-Webhook-Topic"] || "").toString().toLowerCase();

    const supabase = getSupabaseAdmin();
    
    // Base object - will be merged with existing data by Supabase upsert
    let upsertRow = {
      email,
      sync_status: "ready",
      last_synced_at: new Date().toISOString()
    };

    // =================================================================
    // 1. HANDLE SUBSCRIPTION UPDATES
    // =================================================================
    if (topic.includes("subscription")) {
        const subscriptionId = safeNum(payload?.id);
        const adminUrl = subscriptionId ? `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${subscriptionId}&action=edit` : null;
        const name = pickSubscriptionName(payload);

        upsertRow.subscription_id = subscriptionId;
        upsertRow.subscription_admin_url = adminUrl;
        upsertRow.subscription_status = (payload?.status || "").toString() || null;
        upsertRow.start_date_iso = (payload?.start_date_gmt || payload?.start_date || "").toString() || null;
        upsertRow.next_payment_iso = (payload?.next_payment_date_gmt || payload?.next_payment_date || "").toString() || null;
        upsertRow.payment_method = (payload?.payment_method_title || payload?.payment_method || "").toString() || null;
        upsertRow.order_total = safeNum(payload?.total);
        if (name) upsertRow.full_name = name;
        
        // CRITICAL FIX: Also update the "Latest Order" info
        // We now fetch the latest order for the customer, not just the one related to the subscription
        if (payload.customer_id) {
            try {
                 const customerOrders = await wooGet(`/wp-json/wc/v3/orders?customer=${payload.customer_id}&per_page=1`);
                 if (Array.isArray(customerOrders) && customerOrders.length > 0) {
                     const latestOrder = customerOrders[0];
                     upsertRow.latest_order_id = latestOrder.id;
                     upsertRow.latest_order_admin_url = `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${latestOrder.id}&action=edit`;
                     upsertRow.latest_order_status = (latestOrder.status || "").toString() || null;
                     upsertRow.latest_order_date_iso = (latestOrder.date_created_gmt || latestOrder.date_created || "").toString() || null;
                 }
            } catch (err) {
                console.error(`Failed to fetch latest order for customer ${payload.customer_id}:`, err.message);
            }
        }

    // =================================================================
    // 2. HANDLE ORDER UPDATES
    // =================================================================
    } else if (topic.includes("order")) {
        const orderId = safeNum(payload?.id);
        const adminUrl = orderId ? `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${orderId}&action=edit` : null;
        const name = pickSubscriptionName(payload);

        // Fetch existing row to avoid overwriting a NEWER order with an OLDER one
        const { data: existing } = await supabase
            .from("woo_subscription_snapshot")
            .select("latest_order_id, latest_order_date_iso")
            .eq("email", email)
            .maybeSingle();

        const newOrderDate = new Date(payload?.date_created_gmt || payload?.date_created || 0);
        const oldOrderDate = new Date(existing?.latest_order_date_iso || 0);

        // Only update if:
        // 1. We have no existing order
        // 2. This order is newer than the existing one
        // 3. This order IS the existing one (updating status of the current latest)
        const isNewer = newOrderDate > oldOrderDate;
        const isSame = existing?.latest_order_id == orderId;

        if (!existing || isNewer || isSame) {
            upsertRow.latest_order_id = orderId;
            upsertRow.latest_order_admin_url = adminUrl;
            upsertRow.latest_order_status = (payload?.status || "").toString() || null;
            upsertRow.latest_order_date_iso = (payload?.date_created_gmt || payload?.date_created || "").toString() || null;
            if (name) upsertRow.full_name = name;
        } else {
            // It's an old order update. Ignore it to preserve the "Latest Order" field.
            return json(res, 200, { ok: true, ignored: true, reason: "Order is older than current latest" });
        }

    } else {
        // Unknown or irrelevant topic
        return json(res, 200, { ok: true, ignored: true, topic });
    }

    const { error } = await supabase
      .from("woo_subscription_snapshot")
      .upsert(upsertRow, { onConflict: "email" });

    if (error) return json(res, 500, { ok: false, error: "Supabase upsert failed", details: error.message });

    return json(res, 200, { ok: true, email, signature: sigCheck, topic });
  } catch (e) {
    return json(res, e.statusCode || 500, { ok: false, error: e.message || "Server error" });
  }
}
