# Remove the iPhone browser popup

## Changes
- Disable the in-app browser blocking popup on iPhones and other non-Android devices.
- Keep the existing automatic handoff to the phone’s default browser on Android.
- Remove the unused iPhone popup interface and related fallback actions.

## Verification
- Confirm iPhone visitors can use the site normally without the popup.
- Confirm Android in-app browser detection still attempts the external-browser handoff.
- Confirm the app builds without errors.