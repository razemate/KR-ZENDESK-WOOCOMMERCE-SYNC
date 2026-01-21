Based on the review of your project files and the Blueprint, here is the current status and the proposed plan to complete the application.

### **Review Status**

| Component | Status | Findings |
| :--- | :--- | :--- |
| **Zendesk App (Frontend)** | 🟡 Partial | • Logic for fetching/displaying data is correct.<br>• **Missing:** "Next Payment date turns RED if it is a past date" logic is not implemented in `main.js` (though CSS class `.overdue` exists). |
| **Backend (Webhooks)** | 🟡 Partial | • Handles `subscription.updated` events.<br>• **Missing:** Does not capture "Latest Order" data (Order #, Status, Date) as required by the Blueprint. It currently only stores Subscription data. |
| **Backend (Sync)** | 🟡 Partial | • `sync-initial.js` fetches Subscriptions but ignores "Latest Order" data.<br>• **Missing:** Needs to fetch the latest order for each customer to populate the "Latest Order" fields. |
| **Backend (Cron)** | 🔴 Missing | • `cron-nightly.js` is currently a placeholder and does not perform the required nightly reconciliation. |

---

### **Implementation Plan**

I propose the following steps to bring the app into full compliance with the Blueprint:

#### **Step 1: Fix Zendesk App UI (`assets/main.js`)**
- Update `renderRecord` function to compare `record.next_payment_iso` with the current date.
- Apply the existing `.overdue` CSS class if the date is in the past.

#### **Step 2: Implement "Latest Order" Logic (`backend/api/webhook-woo.js`)**
- Update the webhook handler to support `order.created` and `order.updated` topics.
- Extract `id`, `status`, and `date_created` from the order payload.
- Upsert these fields (`latest_order_id`, `latest_order_status`, `latest_order_date_iso`) to the Supabase `woo_subscription_snapshot` table.

#### **Step 3: Update Initial Sync (`backend/api/sync-initial.js`)**
- Modify the sync logic to not just fetch Subscriptions, but also fetch the **Latest Order** for each email.
- This ensures that after the initial sync, the "Latest Order" section in the Zendesk app is populated (instead of showing empty dashes).

#### **Step 4: Implement Nightly Cron (`backend/api/cron-nightly.js`)**
- Implement the reconciliation logic (reusing the improved `sync-initial.js` logic) to ensure data stays consistent.
- Ensure it runs safely within Vercel's timeout limits (or processes in batches).

#### **Step 5: Verify Data Contract**
- Ensure all fields listed in the "Locked data fields" section of the Blueprint are correctly mapped and stored in Supabase.

**Do you want me to proceed with this plan?**