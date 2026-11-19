import { Directory, File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { widgetsDirectory } from 'expo-widgets';

import RecentPhotosWidget from '../widgets/RecentPhotosWidget';
import type { RecentPhoto } from '../widgets/types';

export const WIDGET_PHOTO_COUNT = 3;

// Widgets can't read the app sandbox and have a tight memory budget (~30 MB on iOS),
// so each photo gets a small JPEG copy in the shared widgets directory.
const THUMB_WIDTH = 480;

// Re-render once per minute, aligned to the newest photo's capture time, so the relative time
// ("5 min", "2 hr, 5 min") stays current. Handled natively by patches/expo-widgets+*.patch
// (iOS: an hourly-regenerated timeline; Android: a non-wakeup alarm).
const REFRESH_INTERVAL_MS = 60_000;

type SourcePhoto = { uri: string; takenAt: number };

let queue: Promise<void> = Promise.resolve();

/**
 * Pushes the newest photos (newest first) to the home screen widget.
 * Calls are serialized so overlapping captures/deletes can't race on the thumbnail folder.
 */
export function syncRecentPhotosWidget(photos: SourcePhoto[]): Promise<void> {
  const latest = photos.slice(0, WIDGET_PHOTO_COUNT);
  const task = queue.then(() => sync(latest));
  queue = task.catch(() => {});
  return task;
}

async function sync(latest: SourcePhoto[]) {
  if (!RecentPhotosWidget || !widgetsDirectory) return;

  const dir = new Directory(widgetsDirectory, 'recent_photos');
  dir.create({ intermediates: true, idempotent: true });

  const entries: RecentPhoto[] = [];
  for (const photo of latest) {
    const thumb = new File(dir, `${photo.takenAt}.jpg`);
    if (!thumb.exists) await writeThumbnail(photo.uri, thumb);
    entries.push({ uri: thumb.uri, takenAt: photo.takenAt });
  }

  RecentPhotosWidget.updateSnapshot({
    photos: entries,
    ...(entries.length > 0
      ? { refreshIntervalMs: REFRESH_INTERVAL_MS, refreshAnchorMs: entries[0].takenAt }
      : null),
  });

  // Remove thumbnails that are no longer shown (after the widget stopped referencing them).
  const keep = new Set(latest.map((p) => `${p.takenAt}.jpg`));
  for (const entry of dir.list()) {
    if (entry instanceof File && !keep.has(entry.name)) {
      try {
        entry.delete();
      } catch {}
    }
  }
}

async function writeThumbnail(sourceUri: string, destination: File) {
  const context = ImageManipulator.manipulate(sourceUri);
  try {
    context.resize({ width: THUMB_WIDTH });
    const image = await context.renderAsync();
    try {
      const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
      const temp = new File(result.uri);
      await temp.copy(destination);
      try {
        temp.delete();
      } catch {}
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
