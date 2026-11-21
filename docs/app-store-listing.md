# Apple App Store Submission Package

Ready-to-paste copy, questionnaire answers, App Privacy declarations, and asset inventory for **App Store Connect** (`https://appstoreconnect.apple.com/apps/6837231205`).

> Most localized listing fields, categories, version (`1.0.0`), and copyright are synced automatically when you run `npm run metadata:push` (from `store.config.json`). Complete **Age Rating**, **App Privacy**, **Pricing**, **App Review contact**, and **Screenshots** in the App Store Connect web dashboard.

---

## 1. App Identifiers & General Information

| Field | Value |
| --- | --- |
| **App Name** (≤ 30 chars) | `Parking Picture` *(15 chars)* |
| **Subtitle** (≤ 30 chars) | `Remember where you parked` *(25 chars)* |
| **Bundle ID** | `com.loca-labs.parking-picture` |
| **Apple ID (`ascAppId`)** | `6837231205` |
| **Apple Team ID** | `S39WZ5NLK8` |
| **Primary Language** | English (U.S.) (`en-US`) |
| **Primary Category** | Utilities |
| **Secondary Category** | Navigation |
| **Content Rights** | Does **not** contain, show, or access third-party content |
| **Age Rating** | **4+** (In **App Information → Age Rating**, answer `None` / `No` to all questions including **Social Media: No**; not Made for Kids) |
| **Supported Devices** | iPhone only (`supportsTablet: false` — do **not** upload iPad screenshots) |
| **Price** | Free ($0.00), all territories |
| **Export Compliance** | `ITSAppUsesNonExemptEncryption = false` (already declared in `app.config.ts` — standard HTTPS/TLS only) |

---

## 2. Version 1.0.0 Store Listing (`en-US`)

### Promotional Text (113 / 170 chars)

```text
Snap your parking spot in one tap, check elapsed parking time on your Home Screen widget, and find your car fast.
```

### Description (1,218 / 4,000 chars)

```text
Never wander a parking garage again.

Parking Picture opens straight to the live camera. Snap a quick photo of your parking spot — the floor number, pillar, row sign, or street marker — and it is saved instantly. When it is time to head back, your spot is waiting right on the same screen with the exact time you parked and how long you have been away.

KEY FEATURES
• Instant camera on launch: open the app and tap once to capture, with subtle haptic feedback and a soft shutter sound.
• Built-in flashlight: illuminate dim underground garages and night lots with a single tap.
• Automatic 20-photo history: swipe through up to your 20 most recent parking spots — older photos clean themselves up automatically.
• Home Screen widget: view your latest 3 parking photos and live elapsed parking time right on your Home Screen.
• Pinch & double-tap zoom: inspect level numbers, bay markers, and meter signs in crisp fullscreen detail.
• Easy sharing: share one or multiple parking photos with friends or family using the system share sheet.
• Private by design: your parking photos stay strictly on your device. No account, no sign-up, no ads, and works offline.
```

### Keywords (80 / 100 chars)

*(Words in Title and Subtitle — `parking`, `picture`, `remember`, `where`, `you`, `parked` — are already indexed by Apple and intentionally omitted to maximize search coverage.)*

```text
car,find my car,spot,garage,level,lot,locator,widget,photo,flashlight,timer,auto
```

### URLs & Copyright

| Field | Value |
| --- | --- |
| **Privacy Policy URL** | `https://github.com/loca-labs/parking-picture/blob/main/docs/privacy-policy.md` |
| **Support URL** | `https://github.com/loca-labs/parking-picture/blob/main/docs/support.md` |
| **Marketing URL** *(optional)* | Leave blank or set to your GitHub repo / landing page |
| **Copyright** | `2026 Loca Labs` |

---

## 3. App Privacy (App Store Connect → App Privacy)

Because the app includes **`expo-observe`** for anonymous crash reporting, startup timings, and feature telemetry (stored by Expo for 90 days), select **"Yes, we collect data from this app"** and declare the exact 6 data types below.

- **Parking photos:** Stored strictly on-device (`Paths.document` + App Group widget container). Do **not** select "Photos or Videos" under collected data because photos never leave the device onto a server.

### Data Types & Usage Answers

| Category | Data Type | Purpose(s) | Linked to the User? | Used for Tracking? |
| --- | --- | --- | --- | --- |
| **Location** | **Coarse Location** *(country inferred from IP address)* | Analytics | **No** | **No** |
| **Identifiers** | **Device ID** *(random Expo installation client ID)* | App Functionality, Analytics | **No** | **No** |
| **Usage Data** | **Product Interaction** *(anonymous event counts)* | Analytics | **No** | **No** |
| **Diagnostics** | **Crash Data** *(JS exceptions & native crash logs)* | App Functionality | **No** | **No** |
| **Diagnostics** | **Performance Data** *(launch & render timings)* | App Functionality | **No** | **No** |
| **Diagnostics** | **Other Diagnostic Data** *(OS/device/battery/network state)* | App Functionality | **No** | **No** |

---

## 4. App Review Information

| Field | Value |
| --- | --- |
| **Sign-in required** | **No** (Uncheck "Sign-in required") |
| **Contact Information** | Fill in First Name, Last Name, Email (`contact@loca-labs.com`), and Phone Number (with `+` country code) |

### Review Notes (Copy & Paste)

```text
Thank you for reviewing Parking Picture!

• No account or login is required.
• On first launch, tap "Grant camera access" to enable the live rear camera viewfinder in the top pane.
• Tap the center white shutter button to capture a parking spot photo. It appears immediately in the bottom pane with a timestamp and elapsed parking duration.
• Tap the lightning icon (top-right of camera) on a physical iPhone to toggle the rear flashlight for dark parking garages.
• Tap any saved photo to open it fullscreen (pinch/double-tap to zoom, Share single/multiple photos via the iOS Share Sheet, or Delete). Note: NSPhotoLibraryUsageDescription is only triggered if the user chooses "Save Image" inside the system Share Sheet.
• Home Screen Widget: Long-press the iOS Home Screen → Edit → Add Widget → "Parking Picture" ("Recent parking photos", available in Small, Medium, and Large) to see the latest 3 parking photos and live elapsed timer.
• All captured photos remain strictly on the user's device inside the app sandbox and App Group container.
```

---

## 5. Store Screenshots & Assets Inventory

All files are generated and verified (exact pixel size, sRGB, **24-bit RGB PNG with no alpha channel**):

| Asset | Dimensions | Path |
| --- | --- | --- |
| **App Store Icon** *(bundled automatically via `app.config.ts`, copy included for reference)* | `1024 × 1024 px` | `store-assets/app-store/icon-1024x1024.png` |
| **iPhone 6.9" Display — Slide 1 (Capture & Recall)** *(Required slot)* | `1320 × 2868 px` | `store-assets/app-store/iphone-6.9-1320x2868/01-snap-in-one-tap.png` |
| **iPhone 6.9" Display — Slide 2 (Pinch to Zoom)** | `1320 × 2868 px` | `store-assets/app-store/iphone-6.9-1320x2868/02-zoom-every-detail.png` |
| **iPhone 6.9" Display — Slide 3 (Home Screen Widget)** | `1320 × 2868 px` | `store-assets/app-store/iphone-6.9-1320x2868/03-home-screen-widget.png` |
| **iPhone 6.9" Display — Slide 4 (Flashlight & History)** | `1320 × 2868 px` | `store-assets/app-store/iphone-6.9-1320x2868/04-flashlight-and-history.png` |
| **iPhone 6.9" Display — Slide 5 (Share & Private)** | `1320 × 2868 px` | `store-assets/app-store/iphone-6.9-1320x2868/05-share-and-private.png` |
| **iPhone 6.5" Display (Optional fallback slot)** | `1284 × 2778 px` | `store-assets/app-store/iphone-6.5-1284x2778/01..05-*.png` |

> In App Store Connect, uploading the **6.9" Display (`1320 × 2868`)** set automatically scales down to all smaller iPhone screen sizes unless you choose to override 6.5" separately.
