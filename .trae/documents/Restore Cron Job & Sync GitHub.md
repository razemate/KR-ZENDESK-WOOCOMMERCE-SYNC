I have updated the plan based on your requirements.

### **1. Schedule Adjustment**
*   **Target:** 3:00 AM Vancouver Time (PST/PDT).
*   **Conversion:** Vancouver is UTC-8 (Standard) or UTC-7 (Daylight).
    *   3:00 AM PST = **11:00 AM UTC**.
*   **Conclusion:** The existing schedule `0 11 * * *` (11:00 UTC) is actually **correct** for 3 AM PST. I will keep this schedule string.

### **2. Remove Email Reporting**
*   I will modify `api/cron-nightly.js` to completely remove the code that generates CSVs and sends emails via Nodemailer. It will only sync to Supabase.

### **3. Instant Zendesk Updates (Webhook -> Frontend)**
*   **Current Flow:** Webhook -> Vercel -> Supabase.
*   **The Issue:** When you open a ticket, the Zendesk App fetches data from Supabase. If the webhook hasn't finished processing or Supabase hasn't updated yet, you might see old data for a split second.
*   **The Reality:** Webhooks are near-instant. The Zendesk App *already* fetches the latest data from Supabase every time you load the ticket (via `loadWooData()` in `main.js`).
*   **Verification:** As long as the webhook fires and updates Supabase (which `webhook-woo.js` does), the next time you open the ticket, the app calls `/api/read` which queries Supabase, so it **will** show the updated info. I will verify the webhook logic ensures this "Upsert" happens immediately.

### **Execution Plan**
1.  **Code Cleanup:** Edit `api/cron-nightly.js` to delete the email reporting section.
2.  **Config Restoration:** Create `vercel.json` with the `0 11 * * *` schedule.
3.  **Sync & Deploy:** Commit to GitHub and Redeploy to Vercel.
4.  **Verification:** Manually trigger the cron to ensure it runs without trying to send emails.