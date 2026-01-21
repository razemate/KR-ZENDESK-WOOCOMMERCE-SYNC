I will proceed with the following actions to address your requests:

### **1. Trigger Initial Sync (Correcting SQL Data)**
I will manually trigger the `sync-initial.js` endpoint using your admin secret.
*   **Action:** I will run a `curl` command to hit `https://kr-zendesk-woo-sync.vercel.app/api/sync-initial`.
*   **Result:** This will force the new "Batch Fetch" logic to run immediately. It will iterate through your subscriptions, fetch the specific related order for each, and update the Supabase table. This will populate the missing "Latest Order" data for all existing users.

### **2. Verify Real-time Webhooks**
I have reviewed `backend/api/webhook-woo.js` (see code in previous step) and confirmed it handles both:
*   `subscription.updated` / `created` / `deleted`
*   `order.created` / `updated`
*   **Logic:** When an event comes in, it extracts the relevant data (Subscription ID or Order ID) and performs an `upsert` to Supabase. This ensures that **any** change in WooCommerce is reflected in SQL immediately.
*   **Requirement:** You must ensure that in your **WooCommerce Settings > Advanced > Webhooks**, you have created webhooks for these topics pointing to `https://kr-zendesk-woo-sync.vercel.app/api/webhook-woo` with your `WOO_WEBHOOK_SECRET`.

### **3. Repackage Zendesk App (v5)**
I will finalize the packaging of the Zendesk App (which now includes the Email field).
*   **File:** `UPLOAD_READY\KR_Zendesk_Woo_App_v5.zip`
*   **Action:** You will upload this to Zendesk.

**Plan Execution Order:**
1.  Run `curl` to trigger sync.
2.  Create ZIP v5.
3.  Report completion.

**Ready to execute?**