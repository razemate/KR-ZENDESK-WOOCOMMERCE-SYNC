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
  const header = title ? '<div class="row"><strong>' + esc(title) + '</strong></div>' : '';
  render('<div class="box">' + header + bodyHtml + '</div>');
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

function toTitleCase(str) {
  if (!str || str === "-") return "-";
  return str.replace(/\w\S*/g, function(txt){
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function renderRecord(record) {
  const nextPaymentVal = record.next_payment_iso || "-";
  let nextPaymentClass = "";
  if (nextPaymentVal !== "-") {
    const d = new Date(nextPaymentVal);
    if (!isNaN(d.getTime()) && d < new Date()) {
      nextPaymentClass = "overdue";
    }
  }

  const orderTotal = record.order_total ? "$" + record.order_total : "-";
  const status = toTitleCase(record.subscription_status);
  const orderStatus = toTitleCase(record.latest_order_status);
  
  // Email Link
  let emailHtml = esc(record.email || "-");
  if (record.subscription_admin_url && record.email) {
    emailHtml = '<a href="' + esc(record.subscription_admin_url) + '" target="_blank" style="color: #1f73b7;">' + esc(record.email) + '</a>';
  }

  // Order ID Link
  const orderId = (record.latest_order_id ?? "-").toString();
  let orderIdHtml = esc(orderId);
  if (record.latest_order_admin_url && orderId !== "-") {
    orderIdHtml = '<a href="' + esc(record.latest_order_admin_url) + '" target="_blank" style="color: #1f73b7;">' + esc(orderId) + '</a>';
  }

  renderBox("",
    '<div class="row"><strong>Name:</strong> ' + esc(record.full_name || "-") + '</div>' +
    '<div class="row"><strong>Email:</strong> ' + emailHtml + 
    ' <span class="copy-icon" title="Copy Email" onclick="copyToClipboard(\'' + esc(record.email || "") + '\')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></span></div>' +
    '<div class="row"><strong>Status:</strong> ' + esc(status) + '</div>' +
    '<div class="row"><strong>Start:</strong> ' + esc(formatDate(record.start_date_iso)) + '</div>' +
    '<div class="row"><strong>Next Payment:</strong> <span class="' + nextPaymentClass + '">' + esc(formatDate(nextPaymentVal)) + '</span></div>' +
    '<div class="row"><strong>Payment Method:</strong> ' + esc(record.payment_method || "-") + '</div>' +
    '<div class="row"><strong>Order Total:</strong> ' + esc(orderTotal) + '</div>' +
    '<hr />' +
    '<div class="row"><strong>Latest Order</strong></div>' +
    '<div class="row"><strong>Order #:</strong> ' + orderIdHtml + '</div>' +
    '<div class="row"><strong>Order Status:</strong> ' + esc(orderStatus) + '</div>' +
    '<div class="row"><strong>Order Date:</strong> ' + esc(formatDate(record.latest_order_date_iso)) + '</div>' +
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
