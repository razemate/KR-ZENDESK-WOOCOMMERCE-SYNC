import crypto from "crypto";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { json, pickSubscriptionEmail, pickSubscriptionName, safeNum } from "../lib/utils.js";

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
        
    } else if (topic.includes("order")) {
        const orderId = safeNum(payload?.id);
        const adminUrl = orderId ? `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${orderId}&action=edit` : null;
        const name = pickSubscriptionName(payload);

        upsertRow.latest_order_id = orderId;
        upsertRow.latest_order_admin_url = adminUrl;
        upsertRow.latest_order_status = (payload?.status || "").toString() || null;
        upsertRow.latest_order_date_iso = (payload?.date_created_gmt || payload?.date_created || "").toString() || null;
        if (name) upsertRow.full_name = name;
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
