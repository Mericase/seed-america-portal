# Deploying Seedin America outside the Lovable preview (Cloudflare Workers)

The app reads every credential at **request time** through
`src/lib/runtime-env.server.ts`, which resolves values from `process.env`, the
Cloudflare `env` bindings (captured in `src/server.ts`), `globalThis`, then
build-time `VITE_*` values. So a value works no matter how it is provided.

## 1. Public values (already in `wrangler.jsonc` → `vars`)

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `RESEND_FROM`

## 2. Secrets (must be set with `wrangler secret put`, never in `wrangler.jsonc`)

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # required: admin portal, OTP, notifications
wrangler secret put RESEND_API_KEY              # required: OTP + all outgoing email
wrangler secret put TELEGRAM_BOT_TOKEN          # required: admin activity bot + support chat
wrangler secret put SIGNUP_OTP_SECRET           # optional: dedicated OTP signing key
wrangler secret put TWILIO_API_KEY              # optional: SMS blasts
wrangler secret put TWILIO_FROM                 # optional: SMS sender number
```

`LOVABLE_API_KEY` / connector-gateway routing only exists inside Lovable
hosting. On Cloudflare, email uses Resend directly and Telegram uses the Bot
API directly, so `RESEND_API_KEY` and `TELEGRAM_BOT_TOKEN` are what matter.

## 3. Verify the deployment

Open:

```
https://<your-domain>/api/public/health/config
```

It returns booleans only (no secret values):

```json
{ "ok": true, "core": { ... }, "features": { ... }, "missing": [] }
```

If `missing` is non-empty, set those secrets and redeploy — anything listed
there is the exact cause of "backend not configured" style errors.

## 4. Telegram webhook

The webhook secret is derived from the bot token on Cloudflare:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('telegram-webhook:'+process.env.T).digest('base64url'))" \
  # with T=<bot token>
```

Register it:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<your-domain>/api/public/telegram/webhook" \
  -d "secret_token=<derived secret>"
```
