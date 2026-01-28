# BLUEPRINT — Zendesk ⇄ Woo Subscriptions Viewer (Pre-Synced, Read-Only)

## 0) Goal (What we are building)
A Zendesk **Private App (ZIP upload)** that shows WooCommerce Subscription + Latest Order data for the ticket requester **instantly** in the ticket sidebar when an agent clicks the app icon.

Key behaviors:
- Data is **already available** from a pre-synced SQL table.
- If a record is currently being updated, app shows **“Woo data is syncing…”**.
- If requester email is not a Woo subscriber, app shows **“No Woo Subscription data”**.
- Agent can click **Refresh** to trigger a safe re-check.
- **Read-only guarantee:** Zendesk never edits Woo; Woo never edits Zendesk. Only the SQL table is written.

## 1) Hard rules (Non-negotiable)
1. **No mock or placeholder data** is ever stored in SQL.
2. **WooCommerce is READ-ONLY** (REST used only for reads; webhooks only trigger updates).
3. **Zendesk is READ-ONLY** (no Zendesk write APIs are used).
4. Zendesk iframe **must NOT use raw fetch** — all external calls use **ZAF client.request()**.
5. **Latest order only** (no order history lists).
6. **Next Payment date turns RED** if it is a past date.
7. **Nightly reconciliation sync runs at 3:00 AM Vancouver time (PST/PDT safe).**

## 2) Locked data fields (UI output)
### Woo Subscription Data
- Subscription ID (clickable Woo admin link)
- Email address
- Subscription Status
- Start Date
- Next Payment (RED if past date)
- Payment Method
- Order Total (from latest renewal order)

### Woo Orders Data (LATEST ORDER ONLY)
- Order # (clickable Woo admin link) - *Reflects the most recent order for the customer account, regardless of subscription relation.*
- Order Status
- Order Date

*Note: Email and Order links now use dynamic search URLs to ensure correct admin page navigation.*

If a field does not exist in Woo, it is stored as NULL and rendered as “—” in the UI.
No placeholders are ever written to SQL.

## 3) Architecture (3 layers)
### 3.1 Zendesk Private App (UI only)
- Appears in `support.ticket_sidebar`
- Reads requester email from ticket context
- Calls backend via ZAF secure proxy
- Displays data, sync states, and Refresh button

### 3.2 Backend (Vercel)
Responsible for:
- Initial sync (batch, resumable, background)
- Woo webhooks (trigger updates)
- Read API for Zendesk app
- Manual refresh logic
- Nightly reconciliation job

### 3.3 Storage (Supabase Postgres)
- One table, one row per email
- Indexed by email
- Stores only real Woo data
- SQL is the **only writable layer**

## 4) Sync lifecycle
- Initial sync runs once and preloads all data
- Webhooks keep data fresh in real time
- Refresh button safely re-checks Woo
- Nightly sync repairs missed updates

## 5) Explicit non-goals
- No editing Woo data
- No editing Zendesk data
- No order history
- No analytics
- No complex UI frameworks
