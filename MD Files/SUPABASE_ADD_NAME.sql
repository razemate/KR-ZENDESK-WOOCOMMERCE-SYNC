-- Run this to add the full_name column
ALTER TABLE woo_subscription_snapshot ADD COLUMN IF NOT EXISTS full_name text;

-- Verify
SELECT email, full_name FROM woo_subscription_snapshot LIMIT 5;
