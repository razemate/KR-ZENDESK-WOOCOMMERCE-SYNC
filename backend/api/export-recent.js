import { getSupabaseAdmin } from "../lib/supabase.js";
import { requireAdminSecret } from "../lib/utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    requireAdminSecret(req);

    // Look back 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("woo_subscription_snapshot")
      .select("email, full_name, subscription_status, subscription_id, latest_order_status, latest_order_date_iso, last_synced_at")
      .gt("last_synced_at", since)
      .order("last_synced_at", { ascending: false });

    if (error) throw error;

    // Convert to CSV
    const header = "Email,Name,Status,Subscription ID,Latest Order Status,Latest Order Date,Synced At\n";
    const body = (data || []).map(r => 
        `"${r.email}","${r.full_name||""}","${r.subscription_status||""}","${r.subscription_id||""}","${r.latest_order_status||""}","${r.latest_order_date_iso||""}","${r.last_synced_at}"`
    ).join("\n");

    const csv = header + body;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="daily_report_${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csv);

  } catch (e) {
    res.statusCode = 500;
    res.json({ ok: false, error: e.message });
  }
}
