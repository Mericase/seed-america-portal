# Admin tagging and member assignment

## What will change

Each sub-admin gets a short unique **tag** (e.g. `A1`, `B2`, `C3` — two characters, auto-generated when I promote them, editable by the main admin). Every member can be stamped with one tag.

When a sub-admin signs in to the admin dashboard:

- **Top-level stats** (total members, pending tier upgrades, pending applications, total paid out, etc.) stay fully visible — unchanged.
- **The member list** shows only the members whose tag matches theirs. The counts next to the filter cards (e.g. "pending tier upgrade") reflect only their assigned members.
- Opening a member page, approving / rejecting tier, adjusting balance, sending notifications, viewing files — all restricted to their tagged members. Any attempt to touch an unassigned member returns "Not assigned to you" from the server (not just the UI).
- Admin notification composer: "all members" sends only to their assigned members.

**The main Seedin America admin** (`seedinamerica@hotmail.com`, the permanent admin) sees and controls everything, exactly as today. No tag required.

The main admin manages tags in two places:
1. **Admin list** (new tiny section at the top of /admin) — shows each sub-admin with their tag; edit button opens a short field to change it.
2. **Member detail page** — a new "Assigned to" dropdown pick-list of sub-admins (plus "Unassigned"). Changing it is logged in the Telegram bot alert.

## Validation

- Promoting someone to admin auto-assigns an unused tag; main admin can edit it.
- A sub-admin logged into /admin sees stats but only their assigned members in the list and filters.
- A sub-admin opening a member page by direct URL (`/admin/<id>`) for a member not tagged to them is blocked with a friendly message.
- A sub-admin sending a bulk notification reaches only their assigned members.
- Main admin sees everything, can reassign any member, and can clear a tag.

## Technical details

- `public.profiles.assigned_admin_id uuid null` (FK → `auth.users.id`, nullable, on delete set null) + index.
- `public.user_roles.tag text null` with a partial unique index for admin rows only.
- Server-side gate: every admin server function in `src/lib/admin.functions.ts` runs a helper `assertCanAccessMember(ctx, userId)` that passes if the caller is the permanent admin, otherwise requires `profiles.assigned_admin_id = ctx.userId`.
- Listing/stats: `listUsers` and `pendingAppCounts` filter by `assigned_admin_id` for non-permanent admins; `adminStats` stays global.
- New server functions: `listAdminsWithTags`, `setAdminTag`, `setMemberAssignment`.
- UI: admin list panel at the top of `/admin`, "Assigned to" selector on `/admin/<id>`.
- Permanent admin check uses the existing hard-coded protected UUID already used by `protect_permanent_admin`.
