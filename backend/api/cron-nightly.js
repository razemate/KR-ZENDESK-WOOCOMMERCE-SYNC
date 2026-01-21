import { getSupabaseAdmin } from "../lib/supabase.js";
import { wooGet } from "../lib/woo.js";
import { json, pickSubscriptionEmail, pickSubscriptionName, safeNum } from "../lib/utils.js";
import nodemailer from "nodemailer";

// Extracts the latest order ID from the subscription object (related_orders)
function getLatestOrderIdFromSub(sub) {
    let candidates = [];
    
    // 1. Try related_orders structure
    if (sub?.related_orders) {
        if (Array.isArray(sub.related_orders.renewal)) {
            candidates.push(...sub.related_orders.renewal);
        }
        if (sub.related_orders.parent) {
            candidates.push(sub.related_orders.parent);
        }
    }
    
    // 2. Try direct parent_id
    if (sub?.parent_id) {
        candidates.push(sub.parent_id);
    }
    
    // Filter valid numbers and sort descending (newest ID first)
    candidates = candidates.map(safeNum).filter(n => n !== null).sort((a, b) => b - a);
    
    return candidates.length > 0 ? candidates[0] : null;
}

function mapSubscriptionToRow(sub, orderMap = new Map()) {
  const email = pickSubscriptionEmail(sub);
  const subscriptionId = safeNum(sub?.id);
  const adminUrl = subscriptionId
    ? `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${subscriptionId}&action=edit`
    : null;
  const name = pickSubscriptionName(sub);

  // Find linked latest order data
  const latestOrderId = getLatestOrderIdFromSub(sub);
  const latestOrder = latestOrderId ? orderMap.get(latestOrderId) : null;
  
  let latestOrderAdminUrl = null;
  let latestOrderStatus = null;
  let latestOrderDateIso = null;
  
  if (latestOrder) {
      latestOrderAdminUrl = `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${latestOrder.id}&action=edit`;
      latestOrderStatus = (latestOrder.status || "").toString() || null;
      latestOrderDateIso = (latestOrder.date_created_gmt || latestOrder.date_created || "").toString() || null;
  } else if (latestOrderId) {
      latestOrderAdminUrl = `${process.env.WOO_BASE_URL?.replace(/\/+$/,"")}/wp-admin/post.php?post=${latestOrderId}&action=edit`;
  }
  
  // Fallback: If we still have no date, use the subscription's last payment date or start date
  if (!latestOrderDateIso) {
      latestOrderDateIso = (sub?.last_payment_date_gmt || sub?.last_payment_date || sub?.date_created_gmt || sub?.date_created || "").toString() || null;
  }

  const row = {
    email,
    subscription_id: subscriptionId,
    subscription_admin_url: adminUrl,
    subscription_status: (sub?.status || "").toString() || null,
    start_date_iso: (sub?.start_date_gmt || sub?.start_date || "").toString() || null,
    next_payment_iso: (sub?.next_payment_date_gmt || sub?.next_payment_date || "").toString() || null,
    payment_method: (sub?.payment_method_title || sub?.payment_method || "").toString() || null,
    order_total: safeNum(sub?.total),
    
    // Merged Order Data
    latest_order_id: latestOrderId,
    latest_order_admin_url: latestOrderAdminUrl,
    latest_order_status: latestOrderStatus,
    latest_order_date_iso: latestOrderDateIso,
    
    sync_status: "ready",
    last_synced_at: new Date().toISOString()
  };

  if (name) row.full_name = name;
  return row;
}

function dedupeRowsByEmailKeepHighestSubscriptionId(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r?.email) continue;
    const prev = map.get(r.email);
    const a = r.subscription_id ?? 0;
    const b = prev?.subscription_id ?? 0;
    if (!prev || a > b) map.set(r.email, r);
  }
  return Array.from(map.values());
}

async function sendEmailReport(updatedRows) {
    if (!updatedRows || updatedRows.length === 0) return;
    
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const reportTo = process.env.REPORT_EMAIL_TO; // Admin email

    if (!smtpHost || !smtpUser || !smtpPass || !reportTo) {
        console.warn("Skipping email report: Missing SMTP env vars (SMTP_HOST, SMTP_USER, SMTP_PASS, REPORT_EMAIL_TO)");
        return;
    }

    // Generate CSV
    const header = "Email,Name,Status,Subscription ID,Latest Order Status,Latest Order Date\n";
    const body = updatedRows.map(r => 
        `"${r.email}","${r.full_name||""}","${r.subscription_status||""}","${r.subscription_id||""}","${r.latest_order_status||""}","${r.latest_order_date_iso||""}"`
    ).join("\n");
    
    const csvContent = header + body;

    // Send Email
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 587, // Standard secure port
        secure: false, // true for 465, false for other ports
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    await transporter.sendMail({
        from: `"KR Sync Bot" <${smtpUser}>`,
        to: reportTo,
        subject: `[KR Sync] Daily Update Report - ${updatedRows.length} Changes`,
        text: `The nightly sync job updated ${updatedRows.length} records. See attached CSV for details.`,
        attachments: [
            {
                filename: `sync_report_${new Date().toISOString().split('T')[0]}.csv`,
                content: csvContent
            }
        ]
    });
}

export default async function handler(req, res) {
  try {
    // Look back 25 hours to cover the nightly gap + 1 hour buffer
    const modifiedAfter = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    
    const supabase = getSupabaseAdmin();
    const perPage = 50; 
    let page = 1;
    let totalUpserted = 0;
    const allUpsertedRows = [];
    
    while (true) {
      // 1. Fetch Recently Modified Subscriptions
      const subs = await wooGet(`/wp-json/wc/v3/subscriptions?per_page=${perPage}&page=${page}&modified_after=${modifiedAfter}`);
      if (!Array.isArray(subs) || subs.length === 0) break;

      // 2. Collect Latest Order IDs
      const orderIdsToFetch = new Set();
      for (const sub of subs) {
          const id = getLatestOrderIdFromSub(sub);
          if (id) orderIdsToFetch.add(id);
      }

      // 3. Batch Fetch Orders (If any)
      const orderMap = new Map();
      if (orderIdsToFetch.size > 0) {
          const idsArray = Array.from(orderIdsToFetch);
          const idString = idsArray.join(",");
          
          try {
              const orders = await wooGet(`/wp-json/wc/v3/orders?include=${idString}&per_page=100`);
              if (Array.isArray(orders)) {
                  for (const o of orders) {
                      orderMap.set(o.id, o);
                  }
              }
          } catch (err) {
              console.error("Failed to fetch related orders in cron:", err.message);
          }
      }

      // 4. Map & Merge Data
      const rows = [];
      for (const sub of subs) {
        const row = mapSubscriptionToRow(sub, orderMap);
        if (!row.email || !row.email.includes("@")) continue;
        rows.push(row);
      }

      // 5. Dedupe & Upsert
      const deduped = dedupeRowsByEmailKeepHighestSubscriptionId(rows);

      if (deduped.length > 0) {
        const { error } = await supabase
          .from("woo_subscription_snapshot")
          .upsert(deduped, { onConflict: "email" });

        if (error) return json(res, 500, { ok: false, error: "Supabase upsert failed (cron)", details: error.message });
        totalUpserted += deduped.length;
        allUpsertedRows.push(...deduped);
      }

      page += 1;
      if (subs.length < perPage) break;
    }
    
    // 6. Send Email Report if changes found
    if (allUpsertedRows.length > 0) {
        try {
            await sendEmailReport(allUpsertedRows);
        } catch (emailErr) {
            console.error("Failed to send email report:", emailErr);
            // Don't fail the cron job just because email failed
        }
    }
    
    return json(res, 200, { 
        ok: true, 
        job: "cron-nightly",
        modifiedAfter,
        totalUpserted, 
        pagesProcessed: page 
    });
  } catch (e) {
    return json(res, e.statusCode || 500, { ok: false, error: e.message || "Server error", details: e.details || null });
  }
}
