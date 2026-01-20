import { getSupabaseAdmin } from "../lib/supabase.js";
import { wooGet } from "../lib/woo.js";
import { json, requireAdminSecret, pickSubscriptionEmail, safeNum } from "../lib/utils.js";

function mapSubscriptionToRow(sub) {
  const email = pickSubscriptionEmail(sub);
  const subscriptionId = safeNum(sub?.id);
  const adminUrl = subscriptionId ? `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${subscriptionId}&action=edit` : null;

  return {
    email,
    subscription_id: subscriptionId,
    subscription_admin_url: adminUrl,
    subscription_status: (sub?.status || "").toString() || null,
    start_date_iso: (sub?.start_date_gmt || sub?.start_date || "").toString() || null,
    next_payment_iso: (sub?.next_payment_date_gmt || sub?.next_payment_date || "").toString() || null,
    payment_method: (sub?.payment_method_title || sub?.payment_method || "").toString() || null,
    order_total: safeNum(sub?.total),
    sync_status: "ready",
    last_synced_at: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method Not Allowed" });

    requireAdminSecret(req);

    const supabase = getSupabaseAdmin();

    // Endpoint depends on Woo Subscriptions API availability.
    // Default attempt: wc/v3/subscriptions
    const perPage = 100;
    let page = 1;
    let totalUpserted = 0;
    let totalSkippedNoEmail = 0;

    while (true) {
      const subs = await wooGet(`/wp-json/wc/v3/subscriptions?per_page=${perPage}&page=${page}`);

      if (!Array.isArray(subs) || subs.length === 0) break;

      const rows = [];
      for (const sub of subs) {
        const row = mapSubscriptionToRow(sub);
        if (!row.email || !row.email.includes("@")) {
          totalSkippedNoEmail += 1;
          continue;
        }
        rows.push(row);
      }

      if (rows.length > 0) {
        const { error } = await supabase
          .from("woo_subscription_snapshot")
          .upsert(rows, { onConflict: "email" });

        if (error) return json(res, 500, { ok: false, error: "Supabase upsert failed", details: error.message });
        totalUpserted += rows.length;
      }

      page += 1;
      if (subs.length < perPage) break;
    }

    return json(res, 200, { ok: true, totalUpserted, totalSkippedNoEmail });
  } catch (e) {
    return json(res, e.statusCode || 500, { ok: false, error: e.message || "Server error", details: e.details || null });
  }
}
