# Google Play Store Submission Package

Ready-to-paste copy, App Content / Data Safety declarations, release notes, and asset inventory for **Google Play Console** (`com.loca_labs.parking_picture`).

---

## 1. App Details & Categorization (Grow → Store presence → Store settings)

| Field | Value |
| --- | --- |
| **App name** (≤ 30 chars) | `Parking Picture` *(15 chars)* |
| **Package name** | `com.loca_labs.parking_picture` |
| **App or game** | App |
| **Free or paid** | Free |
| **Category** | Tools *(or Maps & Navigation)* |
| **Tags** *(pick up to 5)* | Tools,Utilities, Maps & navigation |
| **Store listing contact email** *(Required)* | `contact@loca-labs.com` |
| **Website** *(Optional)* | `https://github.com/loca-labs/parking-picture/blob/main/docs/support.md` |

---

## 2. Main Store Listing (`en-US`)

### App Name (15 / 30 chars)

```text
Parking Picture
```

### Short Description (74 / 80 chars)

```text
Snap your parking spot in one tap, check your widget & find your car fast.
```

### Full Description (1,252 / 4,000 chars)

```text
Never wander a parking garage again.

Parking Picture opens straight to the live camera. Snap a quick photo of your parking spot — the floor number, pillar, row sign, or street marker — and it is saved instantly. When it is time to head back, your spot is waiting right on the same screen with the exact time you parked and how long you have been away.

KEY FEATURES
• Instant camera on launch: open the app and tap once to capture, with subtle haptic feedback and a soft shutter sound.
• Built-in flashlight: illuminate dim underground garages and night lots with a single tap.
• Automatic 20-photo history: swipe through up to your 20 most recent parking spots — older photos clean themselves up automatically.
• Resizable Home Screen widget: view your latest 3 parking photos and live elapsed parking time right on your Android Home Screen (2×2 and up).
• Pinch & double-tap zoom: inspect level numbers, bay markers, and meter signs in crisp fullscreen detail.
• Easy sharing: share one or multiple parking photos with friends or family using the Android share sheet.
• Private by design: your parking photos stay strictly on your device. No account, no sign-up, no ads, and works offline.
```

### Release Notes (for Production / Track Release, ≤ 500 chars)

```text
<en-US>
Initial release of Parking Picture (v1.0.0):
• Live camera on launch — save your parking spot in one tap
• Built-in flashlight for dim underground garages
• Up to 20 recent parking photos with live elapsed parking timer
• Fullscreen pinch-to-zoom, multi-photo share, and delete
• Resizable Android Home Screen widget showing your latest 3 spots
</en-US>
```

---

## 3. Policy & App Content Declarations (Monitor and improve → Policy and programs → App content)

Complete every item on the **App content** checklist with the exact answers below:

### 3.1 Privacy Policy
- **Privacy Policy URL:** `https://github.com/loca-labs/parking-picture/blob/main/docs/privacy-policy.md`

### 3.2 App Access
- Select: **"All functionality in my app is available without any access restrictions."** (No login, paywall, or credentials required.)

### 3.3 Ads
- Select: **"No, my app does not contain ads."**

### 3.4 Content Rating (IARC Questionnaire)
- **Email address:** `contact@loca-labs.com`
- **Category:** **Utility, Productivity, Communication, or Other**
- **Questionnaire answers:** Answer **No** to all questions (Violence, Sexuality, Language, Controlled Substances, User-Generated Content / Sharing with strangers, Location sharing with other users, Digital purchases).
- **Expected rating:** ESRB **Everyone**, PEGI **3**, USK **0**, General across all regions.

### 3.5 Target Audience and Content
- **Target age groups:** Check **18 and over** (you may also check **13–15** and **16–17**, do **not** check under 13).
- **Could your store listing unintentionally appeal to children?** **No**

### 3.6 Data Safety Form (Required — matches `expo-observe` + on-device camera)

Because `expo-observe` sends anonymous startup timings, crash logs, random installation ID, coarse IP country, and anonymous event counts over HTTPS to Expo Observe (retained for 90 days), complete the form as follows:

#### Step 1 — Data collection and security

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data is deleted? | **No** *(or select "Data is automatically deleted within 90 days" only if you disable Expo Observe; Expo Observe deletes after 90 days, and does not link data to user accounts — select **"No — collected data is de-identified / not linked to an account"** or provide `mailto:contact@loca-labs.com` if Play Console offers contact URL)* |

> Note: Parking photos are stored **only** on the user's device (`Paths.document`) and are **never** transmitted off-device by the app, so **Photos and videos** is **NOT** checked.

#### Step 2 — Data types to select

Check **only** these 5 items:

1. **Location** → **Approximate location** *(inferred at country level from IP address)*
2. **App activity** → **App interactions** *(anonymous custom events: photo taken/deleted/shared, torch toggled)*
3. **App info and performance** → **Crash logs** *(JS errors & native crashes)*
4. **App info and performance** → **Diagnostics** *(startup & render performance metrics)*
5. **Device or other IDs** → **Device or other IDs** *(random per-installation client ID)*

#### Step 3 — Data usage and handling (same answers for all 5 data types above)

| Question | Answer |
| --- | --- |
| Is this data collected, shared, or both? | **Collected** *(not Shared — Expo acts strictly as a service provider under DPA)* |
| Is this data processed ephemerally? | **No** |
| Is this data required for your app, or can users choose whether it's collected? | **Data collection is required (users can't turn off this data collection)** |
| Why is this user data collected? | Check **Analytics** *(and you may also check **App functionality** for Crash logs & Diagnostics)* |

### 3.7 Other App Content Declarations

| Declaration | Answer |
| --- | --- |
| **News apps** | **No**, my app is not a news app |
| **COVID-19 contact tracing and status apps** | My app is not a publicly available COVID-19 contact tracing or status app |
| **Government apps** | **No** |
| **Financial features** | My app doesn't provide any financial features |
| **Health apps** | My app does not have any health features |
| **Advertising ID** | **No** (The app does not use `AD_ID`) |
| **Photo and Video Permissions** | Not triggered — the Android manifest requests **only** `android.permission.CAMERA` (no `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`) |

---

## 4. Store Graphics & Screenshots Inventory

All files are generated and verified to meet Google Play Console's exact pixel, aspect ratio, color space, and file size rules:

| Asset | Dimensions | Format | Path |
| --- | --- | --- | --- |
| **App Icon** | `512 × 512 px` | 32-bit PNG (≤ 1024 KB) | `store-assets/google-play/icon-512x512.png` |
| **Feature Graphic** | `1024 × 500 px` | 24-bit PNG (no alpha) | `store-assets/google-play/feature-graphic-1024x500.png` |
| **Phone Screenshot 1 — Capture & Recall** | `1080 × 1920 px` (9:16) | 24-bit PNG (no alpha) | `store-assets/google-play/phone-1080x1920/01-snap-in-one-tap.png` |
| **Phone Screenshot 2 — Pinch to Zoom** | `1080 × 1920 px` (9:16) | 24-bit PNG (no alpha) | `store-assets/google-play/phone-1080x1920/02-zoom-every-detail.png` |
| **Phone Screenshot 3 — Home Screen Widget** | `1080 × 1920 px` (9:16) | 24-bit PNG (no alpha) | `store-assets/google-play/phone-1080x1920/03-home-screen-widget.png` |
| **Phone Screenshot 4 — Flashlight & History** | `1080 × 1920 px` (9:16) | 24-bit PNG (no alpha) | `store-assets/google-play/phone-1080x1920/04-flashlight-and-history.png` |
| **Phone Screenshot 5 — Share & Private** | `1080 × 1920 px` (9:16) | 24-bit PNG (no alpha) | `store-assets/google-play/phone-1080x1920/05-share-and-private.png` |

*(4+ high-resolution 9:16 phone screenshots ≥ 1080px also qualify the listing for Google Play promotional placements.)*
