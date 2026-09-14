# Repair Cloudflare authentication and admin operations

## What will change
- Replace the separate hardcoded staff login/session flag with the same secure member authentication and database-backed admin role used everywhere else.
- Route all admin reads and changes through authenticated server functions, removing browser-side privileged database writes and the legacy hosted function call.
- Make server-side authentication and privileged database access read Cloudflare runtime bindings reliably on every request.
- Ensure newly registered, app-verified email accounts can sign in consistently, with clear handling for confirmation state.
- Add safe diagnostics for deployed configuration without exposing credentials.

## Validation
- Check email and username sign-in, session persistence, admin access, member listing, and representative admin updates.
- Verify the Cloudflare worker build has no errors and exercise the deployed-style server endpoints locally.

## Technical details
- Keep bearer-token attachment in TanStack server-function middleware.
- Use authenticated role checks before any privileged operation.
- Use request-time environment resolution for public and private backend values.
- Remove reliance on the old `/functions/v1/admin-update-user` endpoint and client-side admin mutations.
