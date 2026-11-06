# Fix i18n Runtime Errors

## Problem
The app crashes with `changeLanguage is not a function` and `NO_I18NEXT_INSTANCE` warnings. This happens because `i18n.init()` is asynchronous — during SSR, components render before initialization finishes, so `useTranslation` receives an uninitialized i18next instance.

## Fix
One small change in `src/i18n/index.ts`: add `initImmediate: false` to the i18next config. This makes initialization synchronous so the instance is fully ready before any component renders.

No other files need changes.
