import crypto from "crypto";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { json, pickSubscriptionEmail, safeNum } from "../lib/utils.js";

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

    const subscriptionId = safeNum(payload?.id);
    const status = (payload?.status || "").toString() || null;
    const startDate = (payload?.start_date_gmt || payload?.start_date || "").toString() || null;
    const nextPayment = (payload?.next_payment_date_gmt || payload?.next_payment_date || "").toString() || null;
    const paymentMethod = (payload?.payment_method_title || payload?.payment_method || "").toString() || null;
    const total = safeNum(payload?.total);

    const adminUrl = subscriptionId ? `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${subscriptionId}&action=edit` : null;

    const supabase = getSupabaseAdmin();

    const upsertRow = {
      email,
      subscription_id: subscriptionId,
      subscription_admin_url: adminUrl,
      subscription_status: status,
      start_date_iso: startDate,
      next_payment_iso: nextPayment,
      payment_method: paymentMethod,
      order_total: total,
      sync_status: "ready",
      last_synced_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("woo_subscription_snapshot")
      .upsert(upsertRow, { onConflict: "email" });

    if (error) return json(res, 500, { ok: false, error: "Supabase upsert failed", details: error.message });

    return json(res, 200, { ok: true, email, signature: sigCheck });
  } catch (e) {
    return json(res, e.statusCode || 500, { ok: false, error: e.message || "Server error" });
  }
}
