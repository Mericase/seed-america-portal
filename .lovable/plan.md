# Update admin member detail page

Replace `src/routes/admin_.$userId.tsx` with the uploaded version. Key differences in the new file:

- Adds a `TAX_ID_LABEL` map (US→SSN, CA→SIN, AU→TFN, DE→Steuer-ID) and a `taxLabel()` helper so the label adapts per member's country.
- Adds `country` field to the `Profile` type.

## Technical details

- Copy the uploaded file content directly into `src/routes/admin_.$userId.tsx`.
- Verify the build passes after the replacement.
