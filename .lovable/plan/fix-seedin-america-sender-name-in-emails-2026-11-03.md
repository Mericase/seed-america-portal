# Fix "Seedin America" sender name in emails

## Problem

The verification email shows "Seedin America" as the sender name. The app code already uses `"Seedin <info@seedinamerica.org>"` — the display name is correct in the code. The "Seedin America" name is likely coming from:

1. **Resend sender identity**: The Resend account may have "Seedin America" configured as the sender display name, which overrides the `from` field in API calls.
2. **Gmail caching**: Gmail caches sender names from previous emails. If the domain previously sent as "Seedin America", Gmail may continue showing the old name for a while even after the code change.

## Fix

1. Verify the Resend sender identity configuration — if "Seedin America" is set there, it needs to be updated to "Seedin" in the Resend dashboard.
2. As a code-level reinforcement, ensure every email-sending path explicitly sets the display name to "Seedin" (already done in `FROM_ADDRESS`).
3. For Gmail recipients who already received mail from "Seedin America", the cached name will update after they receive new emails with the corrected sender name.

## What you need to do

The sender name is controlled by your Resend account settings for the `seedinamerica.org` domain. Log into your Resend dashboard and update the sender name from "Seedin America" to "Seedin". The app code is already correct — this is a provider-level setting.
