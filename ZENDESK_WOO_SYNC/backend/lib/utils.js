export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export function getEmailFromReq(req) {
  const url = new URL(req.url, "http://localhost");
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  return email;
}

export function requireAdminSecret(req) {
  const expected = process.env.SYNC_ADMIN_SECRET;
  if (!expected) throw new Error("Missing env var: SYNC_ADMIN_SECRET");

  const url = new URL(req.url, "http://localhost");
  const qs = url.searchParams.get("secret") || "";

  const headerX = req.headers["x-admin-secret"] || req.headers["X-Admin-Secret"];
  const auth = req.headers["authorization"] || req.headers["Authorization"] || "";

  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  const provided = (headerX || bearer || qs || "").toString().trim();
  if (!provided || provided !== expected) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
}

export function pickSubscriptionEmail(payload) {
  return (
    payload?.billing?.email ||
    payload?.customer_email ||
    payload?.customer?.email ||
    payload?.billing_email ||
    ""
  ).toString().trim().toLowerCase();
}

export function pickSubscriptionName(payload) {
  const first = (payload?.billing?.first_name || payload?.customer?.first_name || "").toString().trim();
  const last = (payload?.billing?.last_name || payload?.customer?.last_name || "").toString().trim();
  if (first || last) return `${first} ${last}`.trim();
  return null;
}

export function safeNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
