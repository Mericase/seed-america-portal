# Rebrand "Seedin America" to "Seedin" across all emails and code

The sender name in emails still shows "Seedin America" (visible in the screenshot). Every occurrence of the phrase "Seedin America" in the codebase will be replaced with "Seedin". The domain `seedinamerica.org` stays unchanged since that is the actual domain.

## Changes

1. **src/lib/email.server.ts** — change `FROM_ADDRESS` from `"Seedin <info@seedinamerica.org>"` to `"Seedin <info@seedinamerica.org>"` (it may already be correct; will verify). This is the main fix for the sender name.

2. **src/lib/admin.functions.ts** — replace all "Seedin America" references in notification body text with "Seedin" (~6 occurrences).

3. **src/lib/connect-email.functions.ts** — replace "Seedin America" in email subject, body text, and footer (~4 occurrences).

4. **src/lib/account-alerts.server.ts** — replace "Seedin America" in email subject and intro text (~2 occurrences).

5. **src/components/ChatWidget.tsx** — replace "Seedin America" in chat support greeting and header (~2 occurrences).

6. **src/routes/oauth.$provider.return.tsx** — replace "Seedin America" in page head metadata (~3 occurrences).

7. **src/lib/admin-bot.server.ts** — replace comment reference.

8. **src/lib/welcome.functions.ts** — no "Seedin America" text expected, but will verify.

9. **src/routes/api/public/hooks/tier2-nudge.ts** — no display name change needed (only has the domain URL).

All email `@seedinamerica.org` addresses remain unchanged.
