import { Box, Column, Image, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  height,
  paddingAll,
  size,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { RecentPhoto, RecentPhotosProps } from './types';

/** `widgetSize` (dp) is added to the environment by patches/expo-widgets+*.patch. */
type AndroidWidgetEnvironment = WidgetEnvironment & {
  widgetSize?: { width: number; height: number };
};

// The 'widget' directive compiles this function into the widget's own runtime (rendered with
// Jetpack Glance): no hooks, no module-scope values, only the Expo UI components Glance supports.
// Glance has no weight modifier here, so tile sizes are computed from the widget size.
const RecentPhotos = (props: RecentPhotosProps, environment: AndroidWidgetEnvironment) => {
  'widget';
  const PAD = 6;
  const GAP = 6;
  const RADIUS = 12;
  const photos = (props.photos ?? []).slice(0, 3);
  const rootModifiers = [fillMaxSize(), background('#000000'), cornerRadius(16), paddingAll(PAD)];

  if (photos.length === 0) {
    return (
      <Column modifiers={rootModifiers} horizontalAlignment="center" verticalArrangement="center">
        <Text color="#bbbbbb" style={{ fontSize: 13 }}>
          No photo yet
        </Text>
      </Column>
    );
  }

  // Keep in sync with src/utils/formatRelativeTime.ts. Same wording as the iOS relative date style, e.g. "5 min", "2 hr, 5 min".
  const relative = (takenAt: number) => {
    const minutes = Math.max(0, Math.floor((Date.now() - takenAt) / 60000));
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return minutes % 60 ? `${hours} hr, ${minutes % 60} min` : `${hours} hr`;
    const days = Math.floor(hours / 24);
    const dayLabel = days === 1 ? '1 day' : `${days} days`;
    return hours % 24 ? `${dayLabel}, ${hours % 24} hr` : dayLabel;
  };

  const contentWidth = Math.floor((environment.widgetSize?.width ?? 300) - PAD * 2);
  const contentHeight = Math.floor((environment.widgetSize?.height ?? 150) - PAD * 2);

  const tile = (photo: RecentPhoto, index: number, w: number, h: number) => (
    <Box
      key={photo.uri}
      contentAlignment="bottomStart"
      modifiers={[size(w, h), cornerRadius(RADIUS)]}
    >
      <Image
        source={{ uri: photo.uri }}
        contentScale="crop"
        contentDescription="Parking photo"
        modifiers={[size(w, h), cornerRadius(RADIUS)]}
      />
      {index === 0 ? (
        <Box modifiers={[paddingAll(6)]}>
          <Text
            color="#ffffff"
            maxLines={1}
            style={{ fontSize: 11, fontWeight: 'bold', background: '#000000A0' }}
          >
            {relative(photo.takenAt)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );

  const row = (items: RecentPhoto[], firstIndex: number, w: number, h: number) => {
    const tileWidth = Math.floor((w - GAP * (items.length - 1)) / items.length);
    return (
      <Row verticalAlignment="center">
        {items.map((photo, i) => (
          <Row key={photo.uri} verticalAlignment="center">
            {i > 0 ? <Spacer modifiers={[width(GAP)]} /> : null}
            {tile(photo, firstIndex + i, tileWidth, h)}
          </Row>
        ))}
      </Row>
    );
  };

  // Wide widgets (e.g. 4x2, 4x1): all photos side by side.
  // Square / tall widgets (e.g. 2x2, 3x3, 4x4): newest on top, older ones underneath (like iOS).
  const wide = contentWidth / contentHeight >= 1.3;
  if (wide || photos.length === 1) {
    return (
      <Column modifiers={rootModifiers} horizontalAlignment="center" verticalArrangement="center">
        {row(photos, 0, contentWidth, contentHeight)}
      </Column>
    );
  }

  const bottomHeight = Math.floor((contentHeight - GAP) / 3);
  const topHeight = contentHeight - GAP - bottomHeight;
  return (
    <Column modifiers={rootModifiers} horizontalAlignment="center" verticalArrangement="center">
      {tile(photos[0], 0, contentWidth, topHeight)}
      <Spacer modifiers={[height(GAP)]} />
      {row(photos.slice(1), 1, contentWidth, bottomHeight)}
    </Column>
  );
};

export default createWidget<RecentPhotosProps>('RecentPhotos', RecentPhotos, { photos: [] });
