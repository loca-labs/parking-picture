import { type ConfigContext, type ExpoConfig } from 'expo/config';

const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const BUNDLE_IDENTIFIER = 'com.loca-labs.parking-picture';
const ANDROID_PACKAGE = 'com.loca_labs.parking_picture';

const productionAdaptiveIcon = {
  backgroundColor: '#081632',
  foregroundImage: './assets/android-icon-foreground.png',
  backgroundImage: './assets/android-icon-background.png',
  monochromeImage: './assets/android-icon-monochrome.png',
} as const;

function getUniqueIdentifier(): { bundleIdentifier: string; package: string } {
  if (IS_PREVIEW) {
    return {
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.prev`,
      package: `${ANDROID_PACKAGE}.prev`,
    };
  }
  return { bundleIdentifier: BUNDLE_IDENTIFIER, package: ANDROID_PACKAGE };
}

function getAppName(): string {
  const base = 'Parking Picture';
  return IS_PREVIEW ? `${base} (Preview)` : base;
}

export default (_ctx: ConfigContext): ExpoConfig => {
  const { bundleIdentifier, package: androidPackage } = getUniqueIdentifier();
  return {
    name: getAppName(),
    slug: 'parking-picture',
    version: '1.0.0',
    orientation: 'portrait',
    icon: IS_PREVIEW ? './assets/icon-preview.png' : './assets/icon.png',
    userInterfaceStyle: 'dark',
    backgroundColor: '#000000',
    ios: {
      supportsTablet: false,
      bundleIdentifier,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          'Allow $(PRODUCT_NAME) to access your photo library when you share parking photos.',
      },
    },
    android: {
      adaptiveIcon: IS_PREVIEW
        ? {
            backgroundColor: '#2C1D13',
            foregroundImage: './assets/android-icon-foreground-preview.png',
            backgroundImage: './assets/android-icon-background-preview.png',
            monochromeImage: './assets/android-icon-monochrome-preview.png',
          }
        : productionAdaptiveIcon,
      predictiveBackGestureEnabled: false,
      package: androidPackage,
      permissions: ['android.permission.CAMERA'],
    },
    web: {
      favicon: IS_PREVIEW ? './assets/favicon-preview.png' : './assets/favicon.png',
    },
    plugins: [
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow $(PRODUCT_NAME) to use the camera to photograph where you parked',
          recordAudioAndroid: false,
          barcodeScannerEnabled: false,
        },
      ],
      [
        'expo-audio',
        {
          recordAudioAndroid: false,
          enableBackgroundPlayback: false,
        },
      ],
      'expo-asset',
      [
        'expo-widgets',
        {
          // App Group defaults to `group.<bundle id>`, so preview and production builds get separate groups.
          enableAndroid: true,
          widgets: [
            {
              name: 'RecentPhotos',
              displayName: 'Recent parking photos',
              description: 'Your last 3 parking photos.',
              ios: {
                supportedFamilies: ['systemSmall', 'systemMedium', 'systemLarge'],
                contentMarginsDisabled: true,
                initialLayout: './src/widgets/RecentPhotosWidget.ios.tsx',
              },
              android: {
                // Resizable from 2x2 up; the layout adapts to the size (see RecentPhotosWidget.android.tsx).
                minWidth: 110,
                minHeight: 110,
                targetCellWidth: 4,
                targetCellHeight: 2,
                resizeMode: 'both',
                initialLayout: './src/widgets/RecentPhotosWidget.android.tsx',
              },
            },
          ],
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '1d14364d-1fe5-45fe-86a2-68f2f580bb77',
      },
    },
  };
};