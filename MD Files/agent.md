# agent.md — AI Builder Rules

## Mission
Build exactly what is defined in BLUEPRINT.md.
Nothing more. Nothing less.

## Absolute rules
1. DO NOT generate mock, demo, sample, or placeholder data.
2. DO NOT create any code that writes to WooCommerce.
3. DO NOT create any code that writes to Zendesk.
4. SQL is the **only** writable data layer.
5. Use ZAF client.request() for all external calls in Zendesk iframe.
6. Keep everything minimal, readable, and easy to debug.

## UI rules
- Single-column layout only
- No frameworks (React/Vue/etc.)
- Clear visible states only:
  - Data shown
  - Woo data is syncing
  - No Woo Subscription data
  - Error loading data

## Backend rules
- Minimal endpoints only
- Idempotent sync logic
- Explicit sync_status handling
- Verbose but clean logging

## Performance rules
- Indexed lookup by email
- No repeated Woo calls unless syncing
- Rate-limit refresh per email

Violation of any rule is considered a defect.
