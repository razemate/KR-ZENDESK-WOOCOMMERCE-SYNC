# DATA_CONTRACT.md — Backend ↔ Zendesk App

GET /api/read?email={email}
- { ""status"": ""ready"", ""data"": { ... } }
- { ""status"": ""syncing"" }
- { ""status"": ""not_found"" }
- { ""status"": ""no_changes"" }

POST /api/refresh
Body: { ""email"": ""customer@example.com"" }
- { ""status"": ""syncing"" }
- { ""status"": ""no_changes"" }
- { ""status"": ""error"" }

Required data fields when status=ready:
subscription_id
subscription_admin_url
email
subscription_status
start_date_iso
next_payment_iso
payment_method
order_total
latest_order_id
latest_order_admin_url
latest_order_status
latest_order_date_iso