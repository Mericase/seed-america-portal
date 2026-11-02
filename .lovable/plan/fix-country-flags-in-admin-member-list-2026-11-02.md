# Fix country flags in admin member list

The member list query in `listUsers` does not select the `country` column from `profiles`, so every member shows the US flag regardless of their actual country.

## Changes

1. **src/lib/admin.functions.ts** — add `country` to the `.select(...)` string in `listUsers` (line 25).
2. No other changes needed — the admin UI already reads `u.country` and passes it to `countryFlag()`.
