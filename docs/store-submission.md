# Store submission checklist

What's already configured in the repo:

- `eas.json` → build profiles `preview`, `production-simulation` (installable on devices), and `production` (store); see README **Cloud builds with EAS** for matching `npm run build:*` scripts
- `eas.json` → `submit.production` (Google Play `internal` track as `draft`, Apple Team ID `S39WZ5NLK8`)
- `.eas/workflows/build-and-submit-production.yml` → builds both platforms and submits them
- `store.config.json` → App Store listing (title, subtitle, description, keywords, categories, age rating) via EAS Metadata
- `store.config.json` → `apple.info.en-US.privacyPolicyUrl` and `supportUrl` point at the public HTML on GitHub `main`:
  - Privacy: `https://github.com/loca-labs/parking-picture/blob/main/docs/privacy-policy.html`
  - Support: `https://github.com/loca-labs/parking-picture/blob/main/docs/support.html` (contact email in page: `contact@loca-labs.com`)
- `docs/privacy-policy.html`, `docs/support.html` → source files; keep them in sync with store listings when copy changes

## 1. Fill in the missing values

| Where | What |
| --- | --- |
| `store.config.json` → `apple` | Add `"review": { "firstName", "lastName", "email", "phone" }` (App Review contact, phone with country code) |
| `eas.json` → `submit.production.ios` | Add `"ascAppId"` (numeric Apple ID of the app, from App Store Connect → App Information) once the app exists. Required for non-interactive / workflow submits |

If you change where the legal/support pages are hosted, update `privacyPolicyUrl` / `supportUrl` in `store.config.json`, then run `npm run metadata:push`.

## 2. Apple App Store (one-time)

1. Run the first iOS submit interactively so EAS can create the App Store Connect app and set up credentials:
   ```bash
   npm run build:ios
   npm run submit:ios
   ```
   Log in with the Apple ID of team `S39WZ5NLK8` when prompted, and let EAS create the app if it doesn't exist.
2. Let EAS manage an App Store Connect API key (needed by the workflow):
   `npx eas-cli@latest credentials -p ios` → **production** → **App Store Connect: Manage your API Key** → **Set up your project to use an API Key for Expo Submit**.
3. Copy the app's numeric Apple ID into `ascAppId` in `eas.json`.
4. Push the listing: `npm run metadata:push`
5. In App Store Connect, still by hand (not covered by EAS Metadata):
   - **App Privacy** → "Data Not Collected"
   - **Pricing and Availability** → Free, choose countries
   - **Screenshots** → iPhone 6.9" (1320 × 2868) — at least 1, up to 10. iPad not required (`supportsTablet: false`)
   - Select the build from TestFlight on the version page → **Submit for Review**

## 3. Google Play (one-time)

1. Create the app in [Google Play Console](https://play.google.com/console) → **Create app**: name "Parking Picture", App, Free. Package name is `com.loca_labs.parking_picture`.
2. Create a Google Service Account key ([guide](https://expo.fyi/creating-google-service-account)), invite the service account in Play Console → **Users and permissions** with release permissions for this app.
3. Upload the key to Expo: `npx eas-cli@latest credentials -p android` → **production** → **Google Service Account** → **Manage your Google Service Account Key for Play Store Submissions** → **Set up…**
4. Build and submit:
   ```bash
   npm run build:android
   npm run submit:android
   ```
   The release lands on the **Internal testing** track as a **draft** (Google only accepts draft releases while the app itself is still a draft).
5. Complete **Dashboard → Set up your app** in Play Console:
   - **Privacy policy** → same URL as `privacyPolicyUrl` in `store.config.json` (GitHub link above)
   - **App access** → All functionality available without special access
   - **Ads** → No ads
   - **Content rating** → questionnaire, category "Utility"; answer No to everything → rated Everyone / PEGI 3
   - **Target audience** → 18+ (or 13+); not designed for children
   - **Data safety** → "No" to collecting and sharing data (the photo stays on device and is never transmitted)
   - **Government / financial / health apps** → No
   - **Store listing** → short description (≤ 80 chars, e.g. "Snap your parking spot in one tap and find your car fast."), full description (reuse `store.config.json`), app icon 512 × 512, feature graphic 1024 × 500, at least 2 phone screenshots
6. Roll out the internal release, then promote it to Production from Play Console.
7. After the app is published once, change `releaseStatus` in `eas.json` from `"draft"` to `"completed"` so future submits go live on the track automatically.

> New **personal** Google Play developer accounts must run a closed test with at least 12 testers for 14 days before they can publish to Production. Organization accounts are exempt.

## 4. Every release after that

```bash
npx eas-cli@latest workflow:run build-and-submit-production.yml
# or locally: npm run build:all && npm run submit:android && npm run submit:ios
```

Build numbers auto-increment on Expo servers (`appVersionSource: remote`). Bump `version` in `app.config.ts` for user-visible version changes.