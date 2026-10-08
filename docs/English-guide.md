# Where Is It? — English guide

A Korean-first inventory app with an English interface. Use the language selector at the top of the app to choose **English** or **한국어**. The browser remembers your choice. Switching languages preserves your current items, locations and search filters.

Names, tags, notes and location paths are user content and are not automatically translated. The original demo records are in Korean. New AI analyses request names and tags in your selected language; changing the interface language alone never makes an AI request.

## Run in Windows VS Code

Install Node.js 24 or newer. Open the folder containing `package.json` in VS Code, then open a terminal:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the Local URL printed in the terminal. Stop the server with Ctrl+C. Dependencies are not included in source ZIP files.

## Use the app

- **Add item**: enter a name, quantity and optional location, tags, notes or photo.
- **Search items**: search stored names, tags and notes. English search works for English content; it does not translate Korean records.
- **Manage locations**: organize spaces, rooms, furniture and drawers. You cannot delete a location that contains items or sublocations, or move it into itself.
- Select an item to edit, move or delete it. Deletion requires a confirmation screen.
- Photos can be JPEG, PNG or WebP, up to 5MB. Camera availability depends on your device.

## Account and your Gemini API

The operator's local installation is connected to Supabase. A fresh checkout needs its own local environment settings; no private configuration or credentials are included on GitHub. See [the setup guide](사용자_API_설정.md).

Open **Sign in & AI settings**, create an app account, confirm your email, then sign in. This app account is separate from the Supabase dashboard account. Register your own Gemini API key with your consent. The server encrypts it; the operator can decrypt it for analysis. It is not end-to-end encryption. Never put private Gemini keys in browser code or `VITE_` variables.

Actual AI analysis sends a resized JPEG copy to Google only after your explicit consent and button click. It suggests a name and up to three tags for you to review and edit. The server separates Korean and English caches for 24 hours and shares the same daily limit across languages: 20 attempts per Korean calendar day, at least 20 seconds between new requests, one in progress. Failed requests count. No automatic retry is performed. Output is capped at 256 tokens. The app does not enable billing.

## Current limits

Items, locations and original photos still live in browser memory. Refreshing, closing the tab or switching accounts resets them. They do not sync across PCs or Android devices. Member invitations, shared inventory, private photo storage and public website deployment are not implemented. Language preference persists separately and does not imply inventory persistence.

Live user signup, key registration and Gemini recognition still require testing with your own account and key. Tests use simulated provider responses and do not spend Gemini tokens.

## Checks

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run check:server
npm.cmd run test:server
```

Server checks download the Deno tool on first use. Translation messages are maintained in `src/i18n/catalog.ts`; placeholders such as `{name}` must match in both languages.
