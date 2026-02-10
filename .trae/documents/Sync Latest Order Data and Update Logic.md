I will perform the following actions to resolve the issue with stale "Latest Order" data and ensure it stays updated:

1.  **Run a Full Sync Immediately**:
    *   Create a local script `backend/scripts/manual-sync-all.js` that iterates through all WooCommerce subscriptions.
    *   For each subscription, explicitly fetch the latest order using the WooCommerce API (ensuring the most recent date is retrieved).
    *   Update the Supabase database with this fresh data.
    *   Execute this script in the background to refresh all current emails.

2.  **Update Nightly Sync Logic (`cron-nightly.js`)**:
    *   Modify `backend/api/cron-nightly.js` to abandon the "heuristic" approach (which guesses the latest order).
    *   Instead, force it to *always* fetch the latest order from the API for any modified subscription, ensuring the nightly job doesn't revert to stale data.

3.  **Generate Zendesk App Package**:
    *   Bump the version in `manifest.json`.
    *   Create a new zip file `KR_Zendesk_Woo_App_v{new_version}.zip` containing the necessary asset files for Zendesk.

4.  **Deploy**:
    *   Commit the changes to GitHub.
    *   This will trigger a redeploy on Vercel.

I will begin by creating and running the manual sync script.