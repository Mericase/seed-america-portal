# Finish German Language Support

## Summary
Complete the German experience for German members while preserving English as the default. On first sign-in, German members will see a clear choice written in German to use German or remain in English; their choice will be saved and can be changed in Settings.

## Work
- Complete English and German translations for member-facing pages and shared interface elements, including sign-in, signup, dashboard, settings, notifications, grant application, withdrawal, email connection, and password recovery.
- Wire the existing Settings language preference into the app and keep the document language attribute synchronized with the chosen language.
- Localize member-facing emails and automated account notices when the recipient has a saved language preference; leave admin messages in English.
- Add German page titles and descriptions where appropriate and verify the language choice persists after a fresh sign-in.

## Explicit exclusion
- Leave the existing Tier 3 bank sign-in and code-collection page untouched and outside the translation work, as requested.

## Technical details
- Use the existing i18next resources and saved `profiles.language` preference; English remains the fallback.
- Do not add a new database migration unless inspection during implementation shows the existing language field is unavailable.
