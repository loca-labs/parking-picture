import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PhotoViewer } from './components/PhotoViewer';
import { useMinuteClock } from './hooks/useMinuteClock';
import { useSoftShutterSound } from './hooks/useSoftShutterSound';
import { formatRelativeTime } from './utils/formatRelativeTime';
import { formatTime } from './utils/formatTime';
import { syncRecentPhotosWidget } from './utils/recentPhotosWidget';

// TODO: remove before shipping; debug-build timings skew the Observe dashboard.
Observe.configure({ dispatchInDebug: true });

// Photos live in the app's document directory (not purged by the OS like cache),
// one file per shot named `<takenAt ms>.jpg`.
const PHOTO_DIR = new Directory(Paths.document, 'parking_photos');
const MAX_PHOTOS = 20;

type Photo = { file: File; uri: string; takenAt: number };

/** Newest first. */
function readPhotos(): Photo[] {
  if (!PHOTO_DIR.exists) return [];
  const photos: Photo[] = [];
  for (const entry of PHOTO_DIR.list()) {
    if (!(entry instanceof File)) continue;
    const takenAt = Number(entry.name.replace(/\.jpg$/, ''));
    if (Number.isFinite(takenAt)) photos.push({ file: entry, uri: entry.uri, takenAt });
  }
  return photos.sort((a, b) => b.takenAt - a.takenAt);
}
function MainScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>(readPhotos);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [torch, setTorch] = useState(false);
  const [paneWidth, setPaneWidth] = useState(0);
  const listRef = useRef<FlatList<Photo>>(null);
  const playShutterSound = useSoftShutterSound();
  const { markInteractive } = useObserve();

  // Keep the home screen widget (last 3 photos) in sync after launch, capture and delete.
  useEffect(() => {
    syncRecentPhotosWidget(photos).catch((e) => {
      console.warn('Failed to update widget', e);
      Observe.reportError(e);
    });
  }, [photos]);

  useEffect(() => {
    if (permission) markInteractive({ params: { cameraGranted: permission.granted } });
  }, [permission, markInteractive]);

  const capture = useCallback(async () => {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    playShutterSound();
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.6, shutterSound: false });
      const temp = new File(shot.uri);
      PHOTO_DIR.create({ idempotent: true });
      await temp.copy(new File(PHOTO_DIR, `${Date.now()}.jpg`));
      try {
        temp.delete();
      } catch {}
      const all = readPhotos();
      for (const old of all.slice(MAX_PHOTOS)) {
        try {
          old.file.delete();
        } catch {}
      }
      setPhotos(all.slice(0, MAX_PHOTOS));
      setIndex(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Observe.logEvent('photo.taken', {
        attributes: { photoCount: Math.min(all.length, MAX_PHOTOS), torch },
      });
    } catch (e) {
      console.warn('Failed to take photo', e);
      Observe.reportError(e);
    } finally {
      setBusy(false);
    }
  }, [ready, busy, torch, playShutterSound]);

  const deletePhoto = (i: number) => {
    try {
      photos[i]?.file.delete();
    } catch (e) {
      console.warn('Failed to delete photo', e);
      Observe.reportError(e);
    }
    const remaining = readPhotos();
    Observe.logEvent('photo.deleted', { attributes: { photoCount: remaining.length } });
    setPhotos(remaining);
    if (remaining.length === 0) setFullscreen(false);
  };

  const currentIndex = Math.min(index, Math.max(photos.length - 1, 0));
  const current = photos[currentIndex];
  const now = useMinuteClock(current?.takenAt);

  // --- Camera permission ---
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>Camera access is needed to photograph your parking spot.</Text>
        <Pressable
          style={styles.permBtn}
          onPress={async () => {
            if (!permission.canAskAgain) {
              Observe.logEvent('camera_permission.settings_opened');
              Linking.openSettings();
              return;
            }
            const result = await requestPermission();
            Observe.logEvent('camera_permission.requested', {
              attributes: { granted: result.granted },
            });
          }}
        >
          <Text style={styles.permBtnText}>
            {permission.canAskAgain ? 'Grant camera access' : 'Open Settings'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Top half: camera */}
      <View style={styles.pane}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          onCameraReady={() => setReady(true)}
        />
        <Text style={styles.label}>CAMERA</Text>
        <Pressable
          style={[styles.torchBtn, torch && styles.torchBtnOn]}
          onPress={() => {
            Observe.logEvent('torch.toggled', { attributes: { on: !torch } });
            setTorch(!torch);
          }}
          disabled={!ready}
          hitSlop={12}
          accessibilityRole="switch"
          accessibilityState={{ checked: torch }}
          accessibilityLabel="Flashlight"
        >
          <Text style={[styles.torchBtnText, torch && styles.torchBtnTextOn]}>{'\u26A1\uFE0E'}</Text>
        </Pressable>
      </View>

      {/* Shutter button between the two panes */}
      <View style={styles.shutterRow}>
        <Pressable
          onPress={capture}
          disabled={!ready || busy}
          style={({ pressed }) => [
            styles.shutter,
            (pressed || busy) && { transform: [{ scale: 0.92 }] },
            !ready && { opacity: 0.4 },
          ]}
        >
          {busy ? <ActivityIndicator color="#111" /> : <View style={styles.shutterInner} />}
        </Pressable>
      </View>

      {/* Bottom half: saved photos, newest first, swipe to browse */}
      <View style={styles.pane} onLayout={(e) => setPaneWidth(e.nativeEvent.layout.width)}>
        {current ? (
          <>
            {paneWidth > 0 && (
              <FlatList
                ref={listRef}
                data={photos}
                keyExtractor={(p) => p.uri}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                getItemLayout={(_, i) => ({ length: paneWidth, offset: paneWidth * i, index: i })}
                onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / paneWidth))}
                renderItem={({ item, index: i }) => (
                  <Pressable
                    style={{ width: paneWidth }}
                    onPress={() => {
                      Observe.logEvent('photo.opened', { attributes: { index: i } });
                      setIndex(i);
                      setFullscreen(true);
                    }}
                  >
                    <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  </Pressable>
                )}
              />
            )}
            <Text style={styles.label}>PARKED HERE · {formatTime(current.takenAt)}</Text>
            {/* Same badge as on the home screen widget. */}
            <Text style={[styles.label, styles.age]}>{formatRelativeTime(current.takenAt, now)}</Text>
            {photos.length > 1 && (
              <Text style={[styles.label, styles.counter]}>
                {currentIndex + 1}/{photos.length}
              </Text>
            )}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.msg}>No photo yet. Tap the shutter to save where you parked.</Text>
          </View>
        )}
      </View>

      {/* Fullscreen photo viewer */}
      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
        {/* Modal renders in its own native root on Android, so it needs its own gesture root. */}
        <GestureHandlerRootView style={styles.full}>
          <PhotoViewer
            photos={photos}
            initialIndex={currentIndex}
            onIndexChange={(i) => {
              setIndex(i);
              listRef.current?.scrollToIndex({ index: i, animated: false });
            }}
            onClose={() => setFullscreen(false)}
            onDelete={deletePhoto}
          />
        </GestureHandlerRootView>
      </Modal>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

function ErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.msg}>Something went wrong.</Text>
      <Pressable style={styles.permBtn} onPress={resetError}>
        <Text style={styles.permBtnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  return (
    <ObserveRoot errorBoundaryFallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <MainScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ObserveRoot>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  pane: { flex: 1, backgroundColor: '#111', overflow: 'hidden', marginHorizontal: 8, borderRadius: 16 },
  label: {
    position: 'absolute',
    top: 10,
    left: 10,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  counter: { left: undefined, right: 10 },
  age: { top: undefined, bottom: 10 },
  torchBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchBtnOn: { backgroundColor: '#ffd60a' },
  torchBtnText: { color: '#fff', fontSize: 18 },
  torchBtnTextOn: { color: '#000' },
  shutterRow: { height: 96, alignItems: 'center', justifyContent: 'center' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  msg: { color: '#bbb', fontSize: 15, textAlign: 'center' },
  permBtn: { marginTop: 16, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  permBtnText: { color: '#000', fontWeight: '700' },
  full: { flex: 1, backgroundColor: '#000' },
});
