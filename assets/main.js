/* global ZAFClient */
const client = ZAFClient.init();
client.invoke("resize", { width: "100%", height: "700px" });

function render(html) { document.getElementById("app").innerHTML = html; }

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    client.invoke('notify', 'Email copied to clipboard', 'notice');
  }).catch(err => {
    console.error('Failed to copy: ', err);
    client.invoke('notify', 'Failed to copy email', 'error');
  });
}

// Make it global so the inline onclick works
window.copyToClipboard = copyToClipboard;

function renderBox(title, bodyHtml) {
  render('<div class="box"><div class="row"><strong>' + esc(title) + '</strong></div>' + bodyHtml + '</div>');
}

function renderError(title, detailsObj) {
  const details = detailsObj ? '<pre class="row muted">' + esc(JSON.stringify(detailsObj, null, 2)) + '</pre>' : '';
  renderBox("KR Zendesk Woo Sync", '<div class="row">Error: ' + esc(title) + '</div>' + details + '<div class="row"><button id="refreshBtn">Refresh</button></div>');
  document.getElementById("refreshBtn").onclick = loadData;
}

function renderNoData(email) {
  renderBox("KR Zendesk Woo Sync",
    (email ? '<div class="row muted">Requester: ' + esc(email) + '</div>' : '') +
    '<div class="row">No Woo subscription data found.</div>' +
    '<div class="row"><button id="refreshBtn">Refresh</button></div>'
  );
  document.getElementById("refreshBtn").onclick = loadData;
}

function formatDate(isoStr) {
  if (!isoStr || isoStr === "-") return "-";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleDateString('en-US', options);
}

function renderRecord(record) {
  const subUrl = record.subscription_admin_url ? '<div class="row"><a href="' + esc(record.subscription_admin_url) + '" target="_blank">View Subscription in Woo</a></div>' : '';
  const orderUrl = record.latest_order_admin_url ? '<div class="row"><a href="' + esc(record.latest_order_admin_url) + '" target="_blank">View Latest Order in Woo</a></div>' : '';

  const nextPaymentVal = record.next_payment_iso || "-";
  let nextPaymentClass = "";
  if (nextPaymentVal !== "-") {
    const d = new Date(nextPaymentVal);
    if (!isNaN(d.getTime()) && d < new Date()) {
      nextPaymentClass = "overdue";
    }
  }

  const orderTotal = record.order_total ? "$" + record.order_total : "-";

  renderBox("KR Zendesk Woo Sync",
    '<div class="row"><strong>Name:</strong> ' + esc(record.full_name || "-") + '</div>' +
    '<div class="row"><strong>Email:</strong> ' + esc(record.email || "-") + 
    ' <span class="copy-icon" title="Copy Email" onclick="copyToClipboard(\'' + esc(record.email || "") + '\')">📋</span></div>' +
    '<div class="row"><strong>Status:</strong> ' + esc(record.subscription_status || "-") + '</div>' +
    '<div class="row"><strong>Start:</strong> ' + esc(formatDate(record.start_date_iso)) + '</div>' +
    '<div class="row"><strong>Next Payment:</strong> <span class="' + nextPaymentClass + '">' + esc(formatDate(nextPaymentVal)) + '</span></div>' +
    '<div class="row"><strong>Payment Method:</strong> ' + esc(record.payment_method || "-") + '</div>' +
    '<div class="row"><strong>Order Total:</strong> ' + esc(orderTotal) + '</div>' +
    subUrl +
    '<hr />' +
    '<div class="row"><strong>Latest Order</strong></div>' +
    '<div class="row"><strong>Order #:</strong> ' + esc((record.latest_order_id ?? "-").toString()) + '</div>' +
    '<div class="row"><strong>Order Status:</strong> ' + esc(record.latest_order_status || "-") + '</div>' +
    '<div class="row"><strong>Order Date:</strong> ' + esc(formatDate(record.latest_order_date_iso)) + '</div>' +
    orderUrl +
    '<div class="row"><button id="refreshBtn">Refresh</button></div>'
  );

  document.getElementById("refreshBtn").onclick = loadData;
}

async function loadData() {
  try {
    renderBox("KR Zendesk Woo Sync", '<div class="row muted">Loading Woo data…</div>');

    const meta = await client.metadata();
    const baseUrl = meta && meta.settings && meta.settings.api_endpoint ? String(meta.settings.api_endpoint).replace(/\/+$/, "") : "";
    if (!baseUrl.startsWith("http")) {
      renderError("Missing/invalid api_endpoint setting", { api_endpoint: baseUrl });
      return;
    }

    const t = await client.get("ticket.requester.email");
    const email = t["ticket.requester.email"];
    if (!email) { renderNoData(""); return; }

    const url = baseUrl + "/api/read?email=" + encodeURIComponent(email);

    let resp;
    try {
      resp = await client.request({ url, type: "GET", dataType: "json" });
    } catch (err) {
      renderError("Request failed", err);
      return;
    }

    if (!resp || resp.ok !== true) {
      renderError("Bad response from backend", resp);
      return;
    }

    if (!resp.found) { renderNoData(email); return; }

    renderRecord(resp.record || {});
  } catch (e) {
    renderError("Unexpected error", e);
  }
}

document.addEventListener("DOMContentLoaded", loadData);
