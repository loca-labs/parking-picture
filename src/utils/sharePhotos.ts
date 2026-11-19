import { Directory, File, Paths } from 'expo-file-system';
import Share from 'react-native-share';

type SharedPhoto = { uri: string; takenAt: number };

// Shared copies live in the cache: Android's share FileProvider (react-native-share) only
// exposes the cache directory, and the copies get readable names instead of `<ms>.jpg`.
const SHARE_DIR = new Directory(Paths.cache, 'share');

/** Opens the system share sheet for one or more photos. Resolves when the sheet closes. */
export async function sharePhotos(photos: SharedPhoto[]): Promise<void> {
  if (photos.length === 0) return;

  // Copies from the previous share are no longer needed.
  if (SHARE_DIR.exists) SHARE_DIR.delete();
  SHARE_DIR.create({ intermediates: true, idempotent: true });

  const urls: string[] = [];
  for (const photo of photos) {
    const copy = new File(SHARE_DIR, shareFileName(photo.takenAt));
    await new File(photo.uri).copy(copy);
    urls.push(copy.uri);
  }

  await Share.open({
    // A single item uses ACTION_SEND on Android, which more apps accept than ACTION_SEND_MULTIPLE.
    ...(urls.length === 1 ? { url: urls[0] } : { urls }),
    type: 'image/jpeg',
    failOnCancel: false,
  });
}

/** e.g. `parking-2026-11-18-120905.jpg` */
function shareFileName(takenAt: number) {
  const d = new Date(takenAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `parking-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}.jpg`;
}
