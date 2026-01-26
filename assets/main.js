/* global ZAFClient */
const client = ZAFClient.init();
client.invoke("resize", { width: "100%", height: "700px" });

// ==========================================
// TABS LOGIC
// ==========================================
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 1. Toggle Button State
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tab.classList.add('active');

      // 2. Toggle Content State
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const targetId = `tab-${tab.dataset.tab}`;
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// ==========================================
// WOO SYNC LOGIC
// ==========================================
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
window.copyToClipboard = copyToClipboard;

function renderBox(title, bodyHtml) {
  const header = title ? '<div class="row"><strong>' + esc(title) + '</strong></div>' : '';
  render('<div class="box">' + header + bodyHtml + '</div>');
}

function renderError(title, detailsObj) {
  const details = detailsObj ? '<pre class="row muted">' + esc(JSON.stringify(detailsObj, null, 2)) + '</pre>' : '';
  renderBox("KR Zendesk Woo Sync", '<div class="row">Error: ' + esc(title) + '</div>' + details + '<div class="row"><button id="refreshBtn">Refresh</button></div>');
  document.getElementById("refreshBtn").onclick = loadWooData;
}

function renderNoData(email) {
  renderBox("KR Zendesk Woo Sync",
    (email ? '<div class="row muted">Requester: ' + esc(email) + '</div>' : '') +
    '<div class="row">No Woo subscription data found.</div>' +
    '<div class="row"><button id="refreshBtn">Refresh</button></div>'
  );
  document.getElementById("refreshBtn").onclick = loadWooData;
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
  if (record.email) {
    const emailUrl = "https://subscribers.katusaresearch.com/wp-admin/edit.php?s=" + encodeURIComponent(record.email) + "&post_status=all&post_type=shop_subscription&action=-1&m=0&_wcs_product&_payment_method&_customer_user&paged=1&action2=-1";
    emailHtml = '<a href="' + esc(emailUrl) + '" target="_blank" style="color: #1f73b7;">' + esc(record.email) + '</a>';
  }

  // Order ID Link
  const orderId = (record.latest_order_id ?? "-").toString();
  let orderIdHtml = esc(orderId);
  if (orderId !== "-") {
    const orderUrl = "https://subscribers.katusaresearch.com/wp-admin/edit.php?s=" + encodeURIComponent(orderId) + "&post_status=all&post_type=shop_order&action=-1&m=0&wpf_filter&_customer_user&shop_order_subtype&paged=1&action2=-1";
    orderIdHtml = '<a href="' + esc(orderUrl) + '" target="_blank" style="color: #1f73b7;">' + esc(orderId) + '</a>';
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

  document.getElementById("refreshBtn").onclick = loadWooData;
}

async function loadWooData() {
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


// ==========================================
// AI ASSISTANT LOGIC
// ==========================================
async function initAI() {
  const btnRead = document.getElementById("btn-read-ticket");
  const btnInsert = document.getElementById("btn-insert-reply");
  const aiLoading = document.getElementById("ai-loading");
  const aiResult = document.getElementById("ai-result-container");
  const aiOutput = document.getElementById("ai-output");

  btnRead.addEventListener("click", async () => {
    // 1. Get Ticket Context
    aiLoading.style.display = "block";
    aiResult.style.display = "none";
    btnRead.disabled = true;

    try {
      const data = await client.get('ticket.comments');
      const comments = data['ticket.comments'];
      
      if (!comments || comments.length === 0) {
        alert("No comments found in this ticket.");
        aiLoading.style.display = "none";
        btnRead.disabled = false;
        return;
      }

      // Combine last 3 comments for context
      const ticketContent = comments.slice(-3).map(c => 
        `[${c.author.name}]: ${c.value.replace(/<[^>]*>?/gm, '')}` // Strip HTML
      ).join("\n\n");

      // 2. Call Backend API
      const meta = await client.metadata();
      const baseUrl = meta.settings.api_endpoint.replace(/\/+$/, "");
      
      const resp = await client.request({
        url: `${baseUrl}/api/ai-reply`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ticketContent })
      });

      if (resp && resp.ok && resp.reply) {
        aiOutput.value = resp.reply;
        aiResult.style.display = "block";
      } else {
        alert("AI Failed to generate reply.");
      }

    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      aiLoading.style.display = "none";
      btnRead.disabled = false;
    }
  });

  btnInsert.addEventListener("click", () => {
    const text = aiOutput.value;
    if (text) {
      client.invoke('ticket.editor.insert', text);
    }
  });
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  loadWooData();
  initAI();
});
