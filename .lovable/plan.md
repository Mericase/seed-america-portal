# Connect Email — legitimate implementation

Combine three approaches into one "Connect email" experience users open from Settings.

## User flow

1. **Settings → Connect email** opens `/connect-email`.
2. Page explains benefits (safety / third security layer / faster reviews / no missed notifications) with a persuasive but honest tone.
3. Two paths presented:
   - **Link with provider (recommended)** — buttons for Google, Microsoft, Yahoo. Each opens the real provider's OAuth consent (popup) via Lovable's App User Connector. On success we store a per-user connection handle and mark the email as verified.
   - **Verify by code** — for any other email (AOL, iCloud, custom domain, etc.). User types their email, we send a 6-digit OTP from Seedin America via Resend, they enter it back to prove ownership.
4. On success, show connected email + provider badge in Settings, with a **Disconnect** button.
5. Every connect / disconnect fires a Telegram alert to the admin bot (same style as Tier 3).

## Backend

- Migration: `public.linked_emails (user_id, email, provider, verified_at, connection_key_ciphertext nullable)` + `email_verification_codes (user_id, email, code_hash, expires_at, attempts)`. RLS: user can read own row; service_role only for writes.
- Reuse existing encryption helper pattern for the connector connection key (AES-GCM via `APP_USER_CONNECTION_KEY_SECRET`).
- Server functions in `src/lib/connect-email.functions.ts`:
  - `startProviderConnect({ provider })` — kicks off App User Connector OAuth, returns authorization URL.
  - `completeProviderConnect({ code, provider })` — exchanges code, saves encrypted key + email, sends Telegram alert.
  - `sendEmailOtp({ email })` — Resend OTP.
  - `verifyEmailOtp({ email, code })` — check, mark verified, Telegram alert.
  - `getLinkedEmail()` / `disconnectEmail()` — read + remove (Telegram alert on remove).
- Provider connectors: use `connector_app_user--list_connectors` to pick `google`, `microsoft`, `yahoo` (whichever exist). Ask user to link the clients (approval card) before OAuth can work.

## Frontend

- `src/routes/connect-email.tsx` — hero, benefits, provider buttons, OTP fallback form, connected state.
- `src/routes/oauth/$provider/return.tsx` — popup landing page that posts one-time code back to opener.
- `src/routes/settings.tsx` — surface linked email status and disconnect action.

## Security guarantees

- No fake provider login pages. All provider auth happens on the real provider's domain.
- OTP codes are hashed at rest, 10-min expiry, 5-attempt cap, rate-limited per user.
- Connection keys stored encrypted, server-only.
- Admin cannot see or set user passwords or codes anywhere.

## Follow-up

After you approve, I'll list workspace App User Connectors and prompt you to link the ones you want (Google / Microsoft / Yahoo). Providers you skip simply won't appear as buttons.
