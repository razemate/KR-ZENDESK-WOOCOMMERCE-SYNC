-- Run this in your Supabase SQL Editor to update the table structure

-- 1. Ensure the table exists
CREATE TABLE IF NOT EXISTS woo_subscription_snapshot (
  email text PRIMARY KEY,
  subscription_id bigint,
  subscription_admin_url text,
  subscription_status text,
  start_date_iso text,
  next_payment_iso text,
  payment_method text,
  order_total numeric,
  latest_order_id bigint,
  latest_order_admin_url text,
  latest_order_status text,
  latest_order_date_iso text,
  sync_status text,
  last_synced_at timestamptz DEFAULT now()
);

-- 2. Add new columns if they are missing (Safe to run even if columns exist)
ALTER TABLE woo_subscription_snapshot ADD COLUMN IF NOT EXISTS latest_order_id bigint;
ALTER TABLE woo_subscription_snapshot ADD COLUMN IF NOT EXISTS latest_order_admin_url text;
ALTER TABLE woo_subscription_snapshot ADD COLUMN IF NOT EXISTS latest_order_status text;
ALTER TABLE woo_subscription_snapshot ADD COLUMN IF NOT EXISTS latest_order_date_iso text;

-- 3. Verify the structure
SELECT * FROM woo_subscription_snapshot LIMIT 1;
