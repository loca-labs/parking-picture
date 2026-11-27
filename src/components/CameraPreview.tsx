import { forwardRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { GestureDetector, usePinchGesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** Normalized zoom (0 = 1×, 1 = device max) — matches `CameraView` `zoom`. */
export const MIN_CAMERA_ZOOM = 0;
export const MAX_CAMERA_ZOOM = 1;

/** How much normalized zoom changes per unit pinch scale above 1. */
const ZOOM_PER_PINCH_SCALE = 0.5;

type Props = {
  enableTorch: boolean;
  onCameraReady: () => void;
};

function clampZoom(value: number) {
  'worklet';
  return Math.min(Math.max(value, MIN_CAMERA_ZOOM), MAX_CAMERA_ZOOM);
}

export const CameraPreview = forwardRef<ComponentRef<typeof CameraView>, Props>(function CameraPreview(
  { enableTorch, onCameraReady },
  ref,
) {
  const [zoom, setZoom] = useState(MIN_CAMERA_ZOOM);
  const zoomSv = useSharedValue(MIN_CAMERA_ZOOM);
  const pinchStartZoom = useSharedValue(MIN_CAMERA_ZOOM);

  const applyZoom = (value: number) => {
    const clamped = Math.min(Math.max(value, MIN_CAMERA_ZOOM), MAX_CAMERA_ZOOM);
    zoomSv.value = clamped;
    setZoom(clamped);
  };

  const pinch = usePinchGesture({
    onActivate: () => {
      'worklet';
      pinchStartZoom.value = zoomSv.value;
    },
    onUpdate: (e) => {
      'worklet';
      const next = clampZoom(pinchStartZoom.value + (e.scale - 1) * ZOOM_PER_PINCH_SCALE);
      zoomSv.value = next;
      scheduleOnRN(applyZoom, next);
    },
    onDeactivate: (e) => {
      'worklet';
      const next = clampZoom(pinchStartZoom.value + (e.scale - 1) * ZOOM_PER_PINCH_SCALE);
      zoomSv.value = next;
      scheduleOnRN(applyZoom, next);
    },
  });

  return (
    <>
      <CameraView
        ref={ref}
        style={StyleSheet.absoluteFill}
        facing="back"
        zoom={zoom}
        enableTorch={enableTorch}
        onCameraReady={onCameraReady}
      />
      <GestureDetector gesture={pinch}>
        <View style={styles.gestureLayer} accessible accessibilityLabel="Camera preview, pinch to zoom" />
      </GestureDetector>
    </>
  );
});

const styles = StyleSheet.create({
  gestureLayer: StyleSheet.absoluteFill,
});