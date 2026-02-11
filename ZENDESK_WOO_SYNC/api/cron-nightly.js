import { json } from "../lib/utils.js";

// This function handles nightly sync
// Since the 'woo_subscriptions' table is managed by an external process,
// we do NOT run the sync here.

export default async function handler(req, res) {
  try {
    return json(res, 200, { 
        ok: true, 
        job: "cron-nightly",
        status: "disabled",
        reason: "read-only-mode"
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message || "Server error" });
  }
}
