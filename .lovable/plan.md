# Admin Country Switcher

## What it does

Adds a country selector to the admin dashboard header. When an admin picks a different country, the app behaves as if they signed up from that country — showing the same personalized content, labels, and formatting that real members in that country see. The selection persists across page loads (saved to their profile) and does not affect any member data.

## How it works

1. **Server function** (`setAdminCountry`) — updates the admin's own `profiles.country` column. Only users with an admin role can call it.

2. **UI selector** — a compact dropdown in the admin dashboard header (next to the existing controls) showing the country flag and code. Options: US, CA, AU, DE. Selecting a country calls the server function and reloads the page so every country-dependent component picks up the new value.

3. **No migration needed** — the `country` column already exists on `profiles`.

4. **Main admin included** — the permanent Seedin admin account can also switch, same as any sub-admin.

## Technical details

- New server function `setAdminCountry` in `src/lib/admin.functions.ts` with `requireSupabaseAuth` middleware; verifies the caller has an admin role, then updates their own profile's `country`.
- Country selector component rendered in `src/routes/admin.tsx` header area, visible to all admin users.
- On change: calls the server function, invalidates relevant queries so the dashboard and any country-personalized UI refreshes.
