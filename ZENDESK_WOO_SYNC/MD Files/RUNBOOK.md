# RUNBOOK.md - Operations & Debugging

This runbook is for humans.
No automation logic belongs here.

## Initial Setup
1. Deploy Vercel backend
2. Set environment variables
3. Create Supabase tables
4. Configure Woo webhooks
5. Install Zendesk private app

## If Zendesk Shows ""No Woo Subscription data""
- Confirm email exists in Supabase
- Check sync_status
- Check Woo email match

## If Zendesk Shows ""Woo data is syncing…""
- Wait up to 30 seconds
- Refresh ticket
- Check backend logs

## If Data Is Wrong
- Trigger manual refresh
- Verify Woo admin values
- Check last_synced_at_iso

## If Sync Fails
- Check Woo API limits
- Check Supabase availability
- Check Vercel logs

## Forbidden Actions
- Never edit Supabase manually
- Never edit Woo from Zendesk
- Never insert fake data
