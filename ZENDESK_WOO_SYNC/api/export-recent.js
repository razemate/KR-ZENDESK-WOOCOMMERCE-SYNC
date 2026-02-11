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
    // Query 'woo_subscriptions' table
    const { data, error } = await supabase
      .from("woo_subscriptions")
      .select("email, first_name, last_name, status, id, updated_at")
      .gt("updated_at", since)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // Convert to CSV
    // Note: 'latest_order' fields are not available in this table.
    const header = "Email,Name,Status,Subscription ID,Updated At\n";
    const body = (data || []).map(r => {
        const fullName = [r.first_name, r.last_name].filter(Boolean).join(" ");
        return `"${r.email}","${fullName}","${r.status||""}","${r.id||""}","${r.updated_at}"`;
    }).join("\n");

    const csv = header + body;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="daily_report_${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csv);

  } catch (e) {
    res.statusCode = 500;
    res.json({ ok: false, error: e.message });
  }
}
