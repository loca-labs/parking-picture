import { HStack, Image, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  background,
  clipShape,
  clipped,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  padding,
  resizable,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { RecentPhoto, RecentPhotosProps } from './types';

// The 'widget' directive compiles this function into the widget extension's own runtime:
// no hooks, no module-scope values, only Expo UI (SwiftUI) components and modifiers.
const RecentPhotos = (props: RecentPhotosProps, environment: WidgetEnvironment) => {
  'widget';
  const FILL = 10000;
  const photos = (props.photos ?? []).slice(0, 3);
  const family = environment.widgetFamily ?? 'systemMedium';
  const rootModifiers = [
    frame({ minWidth: 0, maxWidth: FILL, minHeight: 0, maxHeight: FILL }),
    padding({ all: 8 }),
    containerBackground('#000000', 'widget'),
  ];

  if (photos.length === 0) {
    return (
      <VStack spacing={6} modifiers={rootModifiers}>
        <Image systemName="car.fill" size={28} color="#ffffff" />
        <Text modifiers={[font({ size: 13 }), foregroundStyle('#bbbbbb')]}>No photo yet</Text>
      </VStack>
    );
  }

  // Keep in sync with src/utils/formatRelativeTime.ts. Same wording as the Android widget, e.g. "5 min", "2 hr, 5 min". Computed from the timeline
  // entry's date; props.refreshIntervalMs makes the (patched) provider add one entry per minute.
  const relative = (takenAt: number) => {
    const now = environment.date?.getTime() ?? Date.now();
    const minutes = Math.max(0, Math.floor((now - takenAt) / 60000));
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return minutes % 60 ? `${hours} hr, ${minutes % 60} min` : `${hours} hr`;
    const days = Math.floor(hours / 24);
    const dayLabel = days === 1 ? '1 day' : `${days} days`;
    return hours % 24 ? `${dayLabel}, ${hours % 24} hr` : dayLabel;
  };

  const tile = (photo: RecentPhoto, index: number) => (
    <ZStack
      key={photo.uri}
      alignment="bottomLeading"
      modifiers={[
        frame({ minWidth: 0, maxWidth: FILL, minHeight: 0, maxHeight: FILL }),
        clipShape('containerRelativeShape'),
      ]}
    >
      <Image
        uiImage={photo.uri}
        modifiers={[
          resizable(),
          aspectRatio({ contentMode: 'fill' }),
          frame({ minWidth: 0, maxWidth: FILL, minHeight: 0, maxHeight: FILL }),
          clipped(),
        ]}
      />
      {index === 0 ? (
        <Text
          modifiers={[
            font({ size: 11, weight: 'semibold' }),
            foregroundStyle('#ffffff'),
            padding({ horizontal: 6, vertical: 3 }),
            background('#000000A0'),
            cornerRadius(6),
            padding({ all: 6 }),
          ]}
        >
          {relative(photo.takenAt)}
        </Text>
      ) : null}
    </ZStack>
  );

  // Medium: three photos side by side.
  if (family === 'systemMedium' || photos.length === 1) {
    return (
      <HStack spacing={6} modifiers={rootModifiers}>
        {photos.map((photo, i) => tile(photo, i))}
      </HStack>
    );
  }

  // Small / large: newest photo on top, the two older ones underneath.
  const rowHeight = family === 'systemSmall' ? 46 : 120;
  return (
    <VStack spacing={6} modifiers={rootModifiers}>
      {tile(photos[0], 0)}
      <HStack spacing={6} modifiers={[frame({ height: rowHeight })]}>
        {photos.slice(1).map((photo, i) => tile(photo, i + 1))}
      </HStack>
    </VStack>
  );
};

export default createWidget<RecentPhotosProps>('RecentPhotos', RecentPhotos, { photos: [] });
