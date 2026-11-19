# parking-picture

A single-screen iOS + Android app for remembering where you parked: the top half shows the live camera, the bottom half shows the last photo. Tapping the shutter overwrites the previous photo. Tap the photo to view it fullscreen.

Built with Expo (React Native, SDK 58). One codebase for both platforms; builds can run in the cloud, so Xcode / Android Studio are optional.

## Structure

| File | Purpose |
|---|---|
| `index.ts` | Entry point, registers `src/App.tsx` |
| `src/App.tsx` | Main screen (camera, capture, storage, display) |
| `src/components/`, `src/hooks/`, `src/utils/` | Photo viewer, shutter sound, helpers |
| `src/utils/sharePhotos.ts` | Shares one or more photos via `react-native-share` (copies them to the cache first) |
| `app.config.ts` | App name, bundle ids, camera permission, preview variants |
| `eas.json` | Cloud build profiles (EAS) |

App identifiers:

- iOS: `com.loca-labs.parking-picture`
- Android: `com.loca_labs.parking_picture` (Android package names can't contain hyphens)

Photos are stored in `Paths.document/parking_photos/<takenAt>.jpg` inside the app sandbox (newest 20 kept).

## Home screen widget (iOS + Android)

`src/widgets/` holds a "Recent parking photos" widget showing the last 3 photos, built with `expo-widgets`:

| File | Purpose |
|---|---|
| `src/widgets/RecentPhotosWidget.ios.tsx` | SwiftUI layout (small / medium / large) |
| `src/widgets/RecentPhotosWidget.android.tsx` | Jetpack Glance layout, resizable from 2x2 (row when wide, big + 2 small when square/tall) |
| `src/widgets/RecentPhotosWidget.web.ts` | No-op for web (`.d.ts` gives the shared type) |
| `src/utils/recentPhotosWidget.ts` | Writes 480px thumbnails to the shared `widgetsDirectory` and calls `updateSnapshot` |

`src/App.tsx` syncs the widget on launch, after every capture and after every delete. Widget code runs in an isolated runtime: inside a `'widget'` function use only Expo UI components/modifiers, no hooks or module-scope values. On iOS the widget shares an App Group (`group.<bundle id>`) with the app; EAS sets up the capability for the `ExpoWidgetsTarget` extension.

Both platforms show how long ago the newest photo was taken, to the minute ("5 min", "2 hr, 5 min"), refreshed once per minute (`refreshIntervalMs`, see the patch below).

`patches/expo-widgets+58.0.29.patch` (applied by `patch-package` on `postinstall`) extends `expo-widgets`: on Android, tapping the widget opens the app and `environment.widgetSize` (dp) is passed to the layout so tiles fill the widget; on both platforms `props.refreshIntervalMs` (aligned to `props.refreshAnchorMs`) re-renders the widget periodically — iOS generates the timeline entries in the extension one hour at a time, Android uses a non-wakeup alarm. Re-check the patch when upgrading `expo-widgets`.

Widgets need a development or release build — `expo-widgets` is not in Expo Go.

## Install

```bash
npm install
```

## Run a development build

The app uses `expo-widgets`, which is not in Expo Go, so run a native build:

```bash
npx expo run:ios       # Simulator or connected iPhone (needs Xcode)
npx expo run:android   # emulator or connected device (needs Android Studio / JDK 17)
```

The Simulator has no camera, so the preview stays black. Use a real device to test capturing.

## Cloud builds with EAS

Profiles in `eas.json`:

| Profile | Purpose | Install on device |
| --- | --- | --- |
| `preview` | Staging app (`*.prev` bundle id, can sit next to production) | Yes — Android APK, iOS ad hoc |
| `production-simulation` | Production bundle id, for testing on dev phones before release | Yes — Android APK, iOS ad hoc |
| `production` | App Store / Play Store | No — Android AAB, iOS store build (`npm run submit:*`) |

```bash
npx eas-cli@latest login   # once
```

**Preview variant** (internal distribution):

```bash
npm run build:preview:android
npm run build:preview:ios
npm run build:preview:all
# or: npx eas-cli@latest workflow:run create-preview-builds.yml
```

**Production identity on dev devices** (`production-simulation`):

```bash
npm run build:simulation
npm run build:simulation:android
npm run build:simulation:ios
```

For iOS internal builds, register each device first: `npx eas-cli@latest device:create`. After adding a device, create a new build (the preview workflow refreshes the ad hoc profile automatically).

**Store release:**

```bash
npm run build:android   # or build:ios / build:all
npm run submit:android
npm run submit:ios
```

First-time store setup: `docs/store-submission.md`.

## Local release builds

Requires Android Studio / JDK 17 (Android) or macOS + Xcode (iOS).

```bash
npm run run:android   # release build on a connected device/emulator
npm run run:ios       # release build on a connected iPhone/simulator
```

`ios/` and `android/` are generated (and git-ignored). Don't edit them by hand; change native config in `app.config.ts` instead.

## Checks

```bash
npm run typecheck
```
