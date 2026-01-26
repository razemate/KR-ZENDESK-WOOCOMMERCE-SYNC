import 'dotenv/config';
import { getSupabaseAdmin } from "../lib/supabase.js";

async function checkStatus() {
  console.log("Checking Supabase Sync Status...");
  const supabase = getSupabaseAdmin();

  try {
    // 1. Get total count
    const { count, error: countError } = await supabase
      .from("woo_subscription_snapshot")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;
    console.log(`\nTotal Records: ${count}`);

    // 2. Fetch status and timestamps (limit to 2000 for performance)
    const { data, error: dataError } = await supabase
      .from("woo_subscription_snapshot")
      .select("sync_status, last_synced_at")
      .order("last_synced_at", { ascending: false })
      .limit(2000);

    if (dataError) throw dataError;

    // 3. Aggregate Data
    const statusCounts = {};
    let mostRecent = null;
    let oldest = null;

    data.forEach(row => {
      // Count status
      const status = row.sync_status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Track timestamps
      if (row.last_synced_at) {
        const date = new Date(row.last_synced_at);
        if (!mostRecent || date > mostRecent) mostRecent = date;
        if (!oldest || date < oldest) oldest = date;
      }
    });

    console.log("\nStatus Breakdown (Last 2000 records):");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    console.log("\nTiming:");
    console.log(`  - Most Recent Sync: ${mostRecent ? mostRecent.toISOString() : "Never"}`);
    console.log(`  - Oldest Sync (in sample): ${oldest ? oldest.toISOString() : "N/A"}`);

    if (count > 2000) {
      console.log(`\n(Note: Analysis based on the most recent 2000 records out of ${count})`);
    }

    // 4. Check for specific errors
    const { data: errorRows, error: errorRowsError } = await supabase
        .from("woo_subscription_snapshot")
        .select("email, sync_status, last_synced_at")
        .eq("sync_status", "error")
        .limit(5);
    
    if (errorRowsError) console.error("Could not fetch error details:", errorRowsError.message);
    
    if (errorRows && errorRows.length > 0) {
        console.log("\nRecent Errors (Top 5):");
        errorRows.forEach(row => {
            console.log(`  - ${row.email}: ${row.last_synced_at}`);
        });
    } else {
        console.log("\nNo records with 'error' status found.");
    }

  } catch (err) {
    console.error("Error checking status:", err.message);
  }
}

checkStatus();
