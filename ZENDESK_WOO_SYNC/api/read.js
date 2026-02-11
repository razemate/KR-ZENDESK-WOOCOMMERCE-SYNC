import { getSupabaseAdmin } from "../lib/supabase.js";
import { json, getEmailFromReq } from "../lib/utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { ok: false, error: "Method Not Allowed" });

    const email = getEmailFromReq(req);
    if (!email || !email.includes("@")) return json(res, 400, { ok: false, error: "Missing or invalid email" });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("woo_subscriptions")
      .select("id, email, status, start_date, next_payment_date, payment_method, total, first_name, last_name, updated_at")
      .eq("email", email)
      .maybeSingle();

    if (error) return json(res, 500, { ok: false, error: "Supabase query failed", details: error.message });

    if (data) {
        const adminUrl = data.id 
            ? `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${data.id}&action=edit` 
            : null;

        const record = {
            email: data.email,
            subscription_id: data.id,
            subscription_admin_url: adminUrl,
            subscription_status: data.status,
            start_date_iso: data.start_date,
            next_payment_iso: data.next_payment_date,
            payment_method: data.payment_method,
            order_total: data.total,
            full_name: [data.first_name, data.last_name].filter(Boolean).join(" "),
            
            // Fields missing from new table schema (will appear empty in UI until refresh)
            latest_order_id: null,
            latest_order_admin_url: null,
            latest_order_status: null,
            latest_order_date_iso: null,
            
            sync_status: "ready", // assumed
            last_synced_at: data.updated_at
        };
        return json(res, 200, { ok: true, found: true, email, record });
    }

    return json(res, 200, { ok: true, found: false, email, record: null });
  } catch (e) {
    return json(res, e.statusCode || 500, { ok: false, error: e.message || "Server error" });
  }
}
