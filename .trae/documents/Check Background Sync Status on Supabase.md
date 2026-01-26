I will create a script to query the Supabase database and report the current status of the background sync.

**Steps:**
1.  **Create a Status Check Script**: I will create a new file `backend/scripts/check-status.js` that:
    *   Connects to Supabase using the existing configuration.
    *   Queries the `woo_subscription_snapshot` table.
    *   Aggregates the data to show:
        *   Total number of records.
        *   Breakdown of records by `sync_status` (e.g., `ready`, `syncing`, `error`).
        *   The timestamp of the most recent sync (`last_synced_at`).
        *   Details of any records with errors.
2.  **Run the Script**: I will execute this script using `node` to display the real-time status in the terminal.

This approach provides a direct and accurate view of the sync status without modifying any data or triggering a new sync job.