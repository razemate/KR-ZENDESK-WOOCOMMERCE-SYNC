import { json } from "../lib/utils.js";

// This function handles WooCommerce webhooks
// Since the 'woo_subscriptions' table is managed by an external process,
// we do NOT update the database here.
// This endpoint exists only to acknowledge the webhook from WooCommerce to prevent errors on the Woo side.

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method Not Allowed" });

    // Log receipt (optional, but good for debugging)
    // console.log("Received Woo Webhook:", req.headers["x-wc-webhook-topic"]);

    // Return success immediately
    return json(res, 200, { ok: true, status: "ignored", reason: "read-only-mode" });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message || "Server error" });
  }
}
