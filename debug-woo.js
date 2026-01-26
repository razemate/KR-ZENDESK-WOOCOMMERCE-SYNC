import { wooGet } from "./backend/lib/woo.js";
import { safeNum } from "./backend/lib/utils.js";
import dotenv from 'dotenv';

// Load env vars from the root .env file if it exists, or assume process.env is set
// Since we are running in a terminal where we might not have the env vars loaded, 
// we'll try to rely on the existing setup or just checking what we can access.
// Actually, in Trae, I can't easily load local .env if it's not in the file system.
// I will check ENVIRONMENT_VARIABLES.md again to see if I can construct the keys?
// No, I shouldn't expose keys.
// I will assume the environment where I run `node` has access if I use `dotenv`.

// Wait, I see `backend/lib/woo.js` uses `process.env`.
// I'll try to read `backend/lib/woo.js` to see dependencies.
// It imports `crypto` etc.

async function run() {
    try {
        console.log("Fetching 1 subscription...");
        // Fetch 1 subscription
        const subs = await wooGet("/wp-json/wc/v3/subscriptions?per_page=1");
        
        if (subs && subs.length > 0) {
            const sub = subs[0];
            console.log("Subscription ID:", sub.id);
            console.log("Parent ID:", sub.parent_id);
            console.log("Related Orders:", JSON.stringify(sub.related_orders, null, 2));
            
            // Test our logic
            const candidates = [];
            if (sub.related_orders) {
                if (Array.isArray(sub.related_orders.renewal)) candidates.push(...sub.related_orders.renewal);
                if (Array.isArray(sub.related_orders.switch)) candidates.push(...sub.related_orders.switch);
                if (sub.related_orders.parent) candidates.push(sub.related_orders.parent);
            }
            if (sub.parent_id) candidates.push(sub.parent_id);
            
            console.log("Raw Candidates:", candidates);
            
            const sorted = candidates.map(safeNum).filter(n => n !== null).sort((a, b) => b - a);
            console.log("Sorted IDs (Newest First):", sorted);
            console.log("Winner:", sorted[0]);
        } else {
            console.log("No subscriptions found.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
