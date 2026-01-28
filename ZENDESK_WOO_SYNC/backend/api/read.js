import { getSupabaseAdmin } from "../lib/supabase.js";
import { json, getEmailFromReq } from "../lib/utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { ok: false, error: "Method Not Allowed" });

    const email = getEmailFromReq(req);
    if (!email || !email.includes("@")) return json(res, 400, { ok: false, error: "Missing or invalid email" });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("woo_subscription_snapshot")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) return json(res, 500, { ok: false, error: "Supabase query failed", details: error.message });

    return json(res, 200, { ok: true, found: !!data, email, record: data || null });
  } catch (e) {
    return json(res, e.statusCode || 500, { ok: false, error: e.message || "Server error" });
  }
}
