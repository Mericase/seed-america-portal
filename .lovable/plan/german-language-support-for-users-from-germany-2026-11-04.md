# German Language Support for Users from Germany

## Summary

Add full German translation to the app. Users whose country is Germany (`DE`) will be prompted on sign-in to switch to German or stay in English. The language preference persists in their profile and can be changed anytime in Settings.

## What users will see

1. **Sign-in prompt (DE users only):** After signing in, if their country is `DE` and no language preference is saved, a modal appears asking:
   - "Sprache wechseln? / Switch language?" with two buttons: **Deutsch** and **English**
2. **Entire app in German:** If they pick Deutsch, every page — dashboard, settings, signup, grant application, notifications, withdrawal, etc. — renders in German.
3. **Settings toggle:** A new "Language / Sprache" section in Settings lets them switch between German and English at any time.

## Technical approach

### 1. Add `react-i18next` for translations

Install `i18next` and `react-i18next`. Create translation files:
- `src/i18n/en.json` — all English strings extracted from the app
- `src/i18n/de.json` — German translations of every string

Initialize i18next in a new `src/i18n/index.ts`, wrap the app in `<I18nextProvider>` in `__root.tsx`.

### 2. Add `language` column to `profiles`

Migration: `ALTER TABLE profiles ADD COLUMN language text DEFAULT NULL;` with values `'en'` or `'de'`. `NULL` means "not yet chosen" (triggers the prompt for DE users).

### 3. Language prompt after sign-in (DE users only)

A `<LanguagePrompt>` component checks:
- User's country is `DE`
- `language` column is `NULL` (never chosen)

Shows a centered modal in German asking them to pick. Saves the choice to `profiles.language` and switches i18next locale instantly.

### 4. Extract and translate all strings

Every route file (19 routes) and shared components (LiveGrantTicker, ChatWidget, NotificationBell, Logo, etc.) will have hardcoded strings replaced with `t('key')` calls. The German translation file will contain all equivalent strings.

Key areas:
- Navigation, headers, buttons, form labels
- Validation and error messages (toast, inline)
- Email subjects and bodies (server-side, based on user's saved language)
- Meta titles and descriptions
- Dashboard cards, tier info, referral copy

### 5. Settings language selector

Add a "Language / Sprache" card in Settings between the existing sections, with a dropdown or toggle for English / Deutsch. Changing it updates `profiles.language` and switches the app language immediately.

### 6. Dynamic `<html lang>` attribute

Update `__root.tsx` to set `<html lang="de">` or `<html lang="en">` based on the active language.

### 7. Server-side emails

Email templates in `account-alerts.server.ts`, `welcome.functions.ts`, `signup-otp.functions.ts`, `connect-email.functions.ts`, and `password-reset.functions.ts` will check the recipient's `language` column and send the German or English version accordingly.

## Scope

- 19 route files updated with `t()` calls
- ~6 shared components updated
- ~5 server-side email/notification modules updated
- 2 new translation JSON files (~300-400 keys each)
- 1 migration (language column)
- 1 new i18n setup module
- 1 new LanguagePrompt component
- Settings page updated with language selector

## Out of scope

- Other languages beyond English and German
- Automatic browser-language detection (country-based only)
- Admin dashboard translation (admin stays in English)
