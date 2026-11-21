# Store Submission Master Checklist

Everything needed to publish **Parking Picture (`v1.0.0`)** on the **Apple App Store** and **Google Play Store**.

---

## Prepared Submission Package Overview

### Documents & Metadata
| File | Purpose |
| --- | --- |
| `store.config.json` | EAS Metadata configuration for App Store Connect (`version: "1.0.0"`, title, subtitle, description, optimized keywords, promo text, categories, URLs) |
| `eas.json` | Cloud build & submit profiles — includes Apple `appleTeamId: "S39WZ5NLK8"` and `ascAppId: "6837231205"`, Google Play `internal` draft track |
| `docs/app-store-listing.md` | Complete **Apple App Store Connect** copy, App Privacy nutrition label answers, reviewer notes, and screenshot list |
| `docs/google-play-listing.md` | Complete **Google Play Console** copy, Data Safety form answers, IARC content rating answers, release notes, and graphic list |
| `docs/privacy-policy.md` | Public Privacy Policy covering on-device photo & widget storage, user-initiated sharing, and `expo-observe` diagnostics |
| `docs/support.md` | Public Support & FAQ covering camera, flashlight, 20-photo history, zoom/share/delete, and iOS/Android Home Screen widgets |

### Store Images (`store-assets/`)
| Platform | Assets Ready to Upload | Directory |
| --- | --- | --- |
| **Apple App Store** | `1024×1024` icon + **5 iPhone 6.9" (`1320×2868`)** screenshots + **5 iPhone 6.5" (`1284×2778`)** screenshots (24-bit PNG, no alpha) | `store-assets/app-store/` |
| **Google Play Store** | **`512×512` icon** + **`1024×500` feature graphic** + **5 Phone (`1080×1920`, 9:16)** screenshots | `store-assets/google-play/` |

---

## 1. Before Submitting: Push Updated Legal Pages

Make sure `docs/privacy-policy.md` and `docs/support.md` are pushed to your public GitHub `main` branch. `store.config.json` links to the rendered Markdown URLs:

- `https://github.com/loca-labs/parking-picture/blob/main/docs/privacy-policy.md`
- `https://github.com/loca-labs/parking-picture/blob/main/docs/support.md`

After changes, run `npm run metadata:push` to sync App Store Connect.

*(Optional code cleanup for your next binary build: remove `Observe.configure({ dispatchInDebug: true });` at line 28 of `src/App.tsx` so local debug launches don't skew your Expo Observe dashboard.)*

---

## 2. Finish Apple App Store Submission (`6837231205`)

Your iOS binary and App Store Connect API key (`2RC8A2KY72`) are already uploaded and configured!

1. **Sync Store Metadata via EAS:**
   *(Optional: add `"review": { "firstName": "...", "lastName": "...", "email": "contact@loca-labs.com", "phone": "+..." }` to `store.config.json` first, or enter it in the web UI.)*
   ```bash
   npm run metadata:push
   ```
2. **Open [App Store Connect](https://appstoreconnect.apple.com/apps/6837231205) and complete:**
   - **General → App Information → Age Rating:** Answer **None** / **No** to every question (including **Social Media: No**) → **4+**.
   - **App Privacy:** Follow the exact 6-row table in [`docs/app-store-listing.md`](./app-store-listing.md#3-app-privacy-app-store-connect--app-privacy) → click **Publish**.
   - **Pricing and Availability:** Select **Free ($0.00)** and choose availability territories.
   - **1.0 Prepare for Submission → Previews and Screenshots:** Upload the 5 PNGs from `store-assets/app-store/iphone-6.9-1320x2868/`.
   - **Build:** Select the uploaded `1.0.0` build from TestFlight.
   - **App Review Information:** Uncheck "Sign-in required", fill in contact phone/name, and paste the Reviewer Notes from [`docs/app-store-listing.md`](./app-store-listing.md#4-app-review-information).
   - Click **Add for Review → Submit to App Review**.

---

## 3. Finish Google Play Store Submission (`com.loca_labs.parking_picture`)

Your Android `.aab` draft and Google Service Account (`play-store-publisher@parking-picture.iam.gserviceaccount.com`) are already uploaded and linked!

1. **Open [Google Play Console](https://play.google.com/console) → Parking Picture → Dashboard:**
2. **Complete "Set up your app" / App content** using [`docs/google-play-listing.md`](./google-play-listing.md#3-policy--app-content-declarations-monitor-and-improve--policy-and-programs--app-content):
   - **Privacy policy** → paste Privacy Policy URL
   - **App access** → All functionality available without special access
   - **Ads** → No ads
   - **Content rating** → Utility; answer **No** to all questions
   - **Target audience** → **18+** (not directed to children)
   - **Data safety** → enter the exact 5 diagnostic/analytics items for `expo-observe` from [`docs/google-play-listing.md`](./google-play-listing.md#36-data-safety-form-required--matches-expo-observe--on-device-camera)
   - **Government / Financial / Health / News / Advertising ID** → **No**
3. **Complete Main Store Listing:**
   - Paste **App name**, **Short description**, and **Full description** from [`docs/google-play-listing.md`](./google-play-listing.md#2-main-store-listing-en-us).
   - Upload `store-assets/google-play/icon-512x512.png` (**App icon**).
   - Upload `store-assets/google-play/feature-graphic-1024x500.png` (**Feature graphic**).
   - Upload all 5 PNGs from `store-assets/google-play/phone-1080x1920/` (**Phone screenshots**).
4. **Publish Release:**
   - Go to **Testing → Internal testing**, review the uploaded draft release, paste the Release Notes from `docs/google-play-listing.md`, roll out, and **Promote release → Production** (note: personal Play developer accounts created after Nov 2023 require 12 testers opted into Closed Testing for 14 days before Production unlocks; organization accounts can publish directly to Production).
   - Once your app is published on Play Store, change `"releaseStatus": "draft"` to `"completed"` in `eas.json` so future `npm run submit:android` runs publish automatically.

---

## 4. Future Releases

```bash
# Bump `version` in app.config.ts and `apple.version` in store.config.json when shipping a new user-facing version, then:
npx eas-cli@latest workflow:run build-and-submit-production.yml
# Or locally:
npm run build:all && npm run submit:android && npm run submit:ios && npm run metadata:push
```
