import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Observe } from 'expo-observe';
import { FlatList } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatTime } from '../utils/formatTime';
import { sharePhotos } from '../utils/sharePhotos';
import { ZoomableImage } from './ZoomableImage';

type Photo = { uri: string; takenAt: number };

type Props = {
  photos: Photo[];
  initialIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onDelete: (index: number) => void;
};

const THUMB_SIZE = 56;

/**
 * Fullscreen pager: swipe between photos, pinch/double-tap to zoom, tap to close.
 * "Share" shares the current photo; "Select" picks one or more photos to share together.
 */
export function PhotoViewer({ photos, initialIndex, onIndexChange, onClose, onDelete }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Photo>>(null);
  const [index, setIndex] = useState(initialIndex);
  // Paging is locked while zoomed so panning the image doesn't flip pages.
  const [zoomed, setZoomed] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const photo = photos[index];

  // After deleting the last photo in the list, step back to the new last one.
  useEffect(() => {
    if (photos.length === 0 || index < photos.length) return;
    const i = photos.length - 1;
    setIndex(i);
    onIndexChange(i);
    listRef.current?.scrollToIndex({ index: i, animated: false });
  }, [photos.length, index, onIndexChange]);

  const goTo = (i: number) => {
    setIndex(i);
    onIndexChange(i);
    listRef.current?.scrollToIndex({ index: i, animated: true });
  };

  const toggle = (uri: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });

  const startSelecting = () => {
    if (!photo) return;
    setSelected(new Set([photo.uri]));
    setSelecting(true);
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const share = async (items: Photo[]) => {
    if (sharing || items.length === 0) return;
    setSharing(true);
    try {
      await sharePhotos(items);
      Observe.logEvent('photo.shared', { attributes: { count: items.length } });
      if (selecting) stopSelecting();
    } catch (e) {
      console.warn('Failed to share photos', e);
      Observe.reportError(e);
      Alert.alert('Could not share', 'Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete this photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setZoomed(false);
          onDelete(index);
        },
      },
    ]);
  };

  // Keep the newest-first order of the gallery.
  const selectedPhotos = photos.filter((p) => selected.has(p.uri));
  const allSelected = photos.length > 0 && selectedPhotos.length === photos.length;
  const currentSelected = !!photo && selected.has(photo.uri);

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={photos}
        keyExtractor={(p) => p.uri}
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
          onIndexChange(i);
        }}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <ZoomableImage
              uri={item.uri}
              // While selecting, tapping the photo toggles it instead of closing the viewer.
              onTap={selecting ? () => toggle(item.uri) : onClose}
              onZoomChange={setZoomed}
            />
          </View>
        )}
      />

      {photo && (
        <Text style={[styles.caption, { top: insets.top + 20 }]}>
          {selecting
            ? `${selectedPhotos.length} selected`
            : `${photos.length > 1 ? `${index + 1}/${photos.length} · ` : ''}${formatTime(photo.takenAt)}`}
        </Text>
      )}

      {selecting ? (
        <Pressable
          style={[styles.topTextBtn, { top: insets.top + 12 }]}
          onPress={stopSelecting}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Cancel selection"
        >
          <Text style={styles.btnText}>Cancel</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel="Close photo"
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      )}

      {photo && selecting && (
        <View style={[styles.bottom, { bottom: insets.bottom + 16 }]}>
          <View style={styles.checkRow}>
            <Pressable
              style={[styles.checkBtn, currentSelected && styles.checkBtnOn]}
              onPress={() => toggle(photo.uri)}
              hitSlop={12}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: currentSelected }}
              accessibilityLabel="Select this photo"
            >
              <Text style={[styles.checkText, currentSelected && styles.checkTextOn]}>✓</Text>
            </Pressable>
          </View>

          {photos.length > 1 && (
            <FlatList
              data={photos}
              keyExtractor={(p) => p.uri}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.strip}
              renderItem={({ item, index: i }) => {
                const isSelected = selected.has(item.uri);
                return (
                  <Pressable
                    onPress={() => toggle(item.uri)}
                    onLongPress={() => goTo(i)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`Photo ${formatTime(item.takenAt)}`}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={[
                        styles.thumb,
                        i === index && styles.thumbCurrent,
                        !isSelected && styles.thumbUnselected,
                      ]}
                    />
                    {isSelected && (
                      <View style={styles.thumbBadge}>
                        <Text style={styles.thumbBadgeText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />
          )}

          <View style={styles.bar}>
            <Pressable
              style={styles.pill}
              onPress={() => setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.uri)))}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.btnText}>{allSelected ? 'Deselect all' : 'Select all'}</Text>
            </Pressable>
            <Pressable
              style={[styles.pill, styles.pillPrimary, (selectedPhotos.length === 0 || sharing) && styles.disabled]}
              onPress={() => share(selectedPhotos)}
              disabled={selectedPhotos.length === 0 || sharing}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Share ${selectedPhotos.length} photos`}
            >
              <Text style={[styles.btnText, styles.btnTextPrimary]}>
                Share{selectedPhotos.length > 0 ? ` (${selectedPhotos.length})` : ''}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {photo && !selecting && (
        <View style={[styles.bottom, { bottom: insets.bottom + 24 }]}>
          <View style={styles.bar}>
            <Pressable
              style={[styles.pill, sharing && styles.disabled]}
              onPress={() => share([photo])}
              disabled={sharing}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Share photo"
            >
              <Text style={styles.btnText}>Share</Text>
            </Pressable>
            <Pressable
              style={styles.pill}
              onPress={startSelecting}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Select photos to share"
            >
              <Text style={styles.btnText}>Select</Text>
            </Pressable>
            <Pressable
              style={styles.pill}
              onPress={confirmDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Delete photo"
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  caption: {
    position: 'absolute',
    left: 16,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  topTextBtn: {
    position: 'absolute',
    right: 16,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 12 },
  bar: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pillPrimary: { backgroundColor: '#fff' },
  disabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnTextPrimary: { color: '#000' },
  deleteBtnText: { color: '#ff453a', fontSize: 15, fontWeight: '700' },
  checkRow: { alignSelf: 'stretch', alignItems: 'flex-end', paddingHorizontal: 16 },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnOn: { backgroundColor: '#0a84ff', borderColor: '#0a84ff' },
  checkText: { color: 'transparent', fontSize: 18, fontWeight: '800' },
  checkTextOn: { color: '#fff' },
  strip: { paddingHorizontal: 16, gap: 8 },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 8 },
  thumbCurrent: { borderWidth: 2, borderColor: '#fff' },
  thumbUnselected: { opacity: 0.45 },
  thumbBadge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
