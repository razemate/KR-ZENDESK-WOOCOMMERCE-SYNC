I will fix the incorrect 'Latest Order' display issue and update the 'Refresh Button' functionality.

### **1. Fix Incorrect 'Latest Order' & Implement Refresh Logic**
Currently, `api/read.js` only reads from Supabase, so clicking "Refresh" does not fetch new data from WooCommerce. I will create a new endpoint `backend/api/refresh-one.js` that:
1.  Accepts an `email`.
2.  Fetches the customer from WooCommerce (`/customers?email=...`) to get their ID.
3.  Fetches the **latest order** for that customer (`/orders?customer=<id>&per_page=1`).
4.  Fetches the **subscription** for that customer (`/subscriptions?customer=<id>`).
5.  Updates Supabase with the fresh data (merging subscription and latest order info).
6.  Returns the updated record.

This solves both problems:
-   **Accuracy:** It explicitly fetches the latest order for the customer *right now*.
-   **Refresh:** The button will now trigger a real-time update instead of just re-reading stale data.

### **2. Update Frontend (`assets/main.js`)**
I will update the `loadWooData` function in `assets/main.js` to:
-   Call the new `/api/refresh-one` endpoint when the "Refresh" button is clicked (or passing a `force=true` flag to a unified endpoint).
-   *Wait, to keep it simple and robust:* I will update `backend/api/read.js` to accept a `?refresh=true` query parameter. If present, it will perform the fetch-and-update logic before returning.
    -   *Actually, a separate endpoint `api/refresh-single.js` might be cleaner to avoid side effects in `read.js`.*
    -   *Decision:* I'll create `backend/api/refresh-single.js` and update `assets/main.js` to call this endpoint when the "Refresh" button is clicked. The initial load will still use `api/read.js` for speed.

### **3. Redeploy and Deliver**
-   I will verify the code changes.
-   I will bump the version number.
-   I will zip the files for upload.

**Plan Execution:**
1.  Create `backend/api/refresh-single.js`.
2.  Update `assets/main.js` to use the new endpoint for the Refresh button.
3.  Update `manifest.json` version.
4.  Create the zip package.
