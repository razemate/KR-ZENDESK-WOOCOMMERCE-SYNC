function wooBaseUrl() {
  const base = (process.env.WOO_BASE_URL || "").trim();
  if (!base) throw new Error("Missing env var: WOO_BASE_URL");
  return base.replace(/\/+$/, "");
}

function wooAuthHeader() {
  const ck = process.env.WOO_CONSUMER_KEY;
  const cs = process.env.WOO_CONSUMER_SECRET;
  if (!ck) throw new Error("Missing env var: WOO_CONSUMER_KEY");
  if (!cs) throw new Error("Missing env var: WOO_CONSUMER_SECRET");
  const token = Buffer.from(`${ck}:${cs}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export async function wooGet(pathWithQuery) {
  const url = `${wooBaseUrl()}${pathWithQuery.startsWith("/") ? "" : "/"}${pathWithQuery}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Authorization": wooAuthHeader(), "Accept": "application/json" }
  });

  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!res.ok) {
    const err = new Error(`Woo GET failed: ${res.status}`);
    err.statusCode = res.status;
    err.details = body;
    throw err;
  }
  return body;
}
