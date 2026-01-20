import { json } from "../lib/utils.js";

export default async function handler(req, res) {
  // Placeholder: keep alive + future repair sync.
  return json(res, 200, { ok: true, job: "cron-nightly", ts: new Date().toISOString() });
}
