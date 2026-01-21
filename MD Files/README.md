# KR Zendesk WooCommerce Sync — README

This repository contains the COMPLETE blueprint for a
Zendesk Private App that displays WooCommerce Subscription data.

## What This Is
- A READ-ONLY Zendesk sidebar app
- Shows pre-synced Woo subscription + latest order data
- Uses Supabase as the authoritative store
- Uses Vercel for backend sync logic

## What This Is NOT
- NOT a Woo editor
- NOT a Zendesk editor
- NOT a real-time dependency on Woo APIs
- NOT a UI framework or complex app

## Core Guarantees
- Zendesk cannot modify Woo data
- Woo cannot modify Zendesk data
- Only SQL (Supabase) is writable
- No mock or placeholder data
- Background sync works while laptops are OFF

## Sync Summary
- Initial sync: one-time, background
- Nightly sync: daily at 03:00 Vancouver time
- Webhooks: real-time updates
- Manual refresh: per-ticket only

## File Order (Authoritative)
1. BLUEPRINT.md
2. agent.md
3. FILE_STRUCTURE.md
4. DATA_CONTRACT.md
5. SUPABASE_SCHEMA.md
6. ENVIRONMENT_VARIABLES.md
7. VERCEL_BACKEND.md
8. SYNC_LIFECYCLE.md
9. RUNBOOK.md
10. UPLOAD_AND_TESTING.md
11. README.md

This README is informational only.
All authority lives in the blueprint files.
