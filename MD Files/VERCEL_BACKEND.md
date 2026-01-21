# VERCEL_BACKEND.md - Backend Responsibilities (Authoritative)

This document defines EXACTLY what the Vercel backend does.
Anything not listed here MUST NOT be implemented.

## Purpose
- Acts as a READ-ONLY bridge between:
  WooCommerce → Supabase → Zendesk App
- Owns ALL sync logic
- Runs independently of any human device

## API Endpoints (ONLY THESE)

GET /api/read
- Input: email
- Output: flat Woo snapshot from Supabase
- NEVER calls Woo directly

POST /api/refresh
- Input: email
- Behavior:
  - Marks record as syncing
  - Fetches Woo data
  - Updates Supabase
  - Returns status only

POST /api/sync-initial
- Protected by SYNC_ADMIN_SECRET
- Runs initial full sync
- Paginated
- Resumable

POST /api/webhook-woo
- Validates Woo webhook
- Updates affected email only

POST /api/cron-nightly
- Triggered by Vercel cron
- Runs incremental sync
- Vancouver time (03:00)

## Hard Rules
- NO Woo writes
- NO Zendesk writes
- NO mock data
- Supabase is the ONLY writable store
- Flat JSON responses only
- Errors must be logged, not hidden
