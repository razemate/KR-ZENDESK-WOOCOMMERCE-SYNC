# IFRAME_UI.md — Zendesk Ticket Sidebar UI (Authoritative)

Endpoint:
GET {api_endpoint}/api/read?email={requester_email}

Allowed status values:
- ready
- syncing
- not_found
- error
- no_changes

Fields are FLAT (no nested objects).

If next_payment_iso is in the past (Vancouver time),
render the date in RED.

UI States:
- ready → show data
- syncing → show "Woo data is syncing…"
- not_found → show "No Woo Subscription data"
- error → show error message

Refresh Button:
POST {api_endpoint}/api/refresh

Rules:
- ZAF client.request() ONLY
- No fetch()
- Single-column layout
