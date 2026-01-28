# SYNC_LIFECYCLE.md - Data Flow & Timing (Authoritative)

This file explains WHEN and HOW data moves.

## 1. Initial Sync (ONE TIME)
- Triggered manually
- Runs in background
- Does not block Zendesk
- Writes ALL Woo subscribers to Supabase
- Duration depends on Woo size
- Safe to stop and resume

## 2. Nightly Sync (AUTOMATED)
- Runs daily at 03:00 Vancouver time
- Incremental only
- Skips unchanged records
- Runs even if laptops are OFF

## 3. Webhook Updates (REAL-TIME)
- Triggered by:
  - Payment completed
  - Subscription status change
- Updates ONE email only

## 4. Manual Refresh (ON DEMAND)
- Triggered from Zendesk UI
- Affects ONE ticket/email only
- UI shows ""Woo data is syncing…""

## Sync States
- ready
- syncing
- not_found
- error
- no_changes

## Guarantees
- Zendesk NEVER waits on Woo
- Stale data is allowed briefly
- Accuracy > immediacy
