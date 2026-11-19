import { StyleSheet, View } from 'react-native';
import {
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

type Props = {
  uri: string;
  /** Called on a single tap while the image is not zoomed in. */
  onTap?: () => void;
  /** Called when the image enters or leaves the zoomed-in state. */
  onZoomChange?: (zoomed: boolean) => void;
};

export function ZoomableImage({ uri, onTap, onZoomChange }: Props) {
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const zoomed = useSharedValue(false);

  useAnimatedReaction(
    () => scale.value > 1,
    (isZoomed, wasZoomed) => {
      if (isZoomed === wasZoomed) return;
      zoomed.value = isZoomed;
      if (onZoomChange) scheduleOnRN(onZoomChange, isZoomed);
    },
  );

  const settle = () => {
    'worklet';
    const s = Math.min(Math.max(scale.value, 1), MAX_SCALE);
    const maxX = (width.value * (s - 1)) / 2;
    const maxY = (height.value * (s - 1)) / 2;
    scale.value = withTiming(s);
    tx.value = withTiming(Math.min(Math.max(tx.value, -maxX), maxX));
    ty.value = withTiming(Math.min(Math.max(ty.value, -maxY), maxY));
  };

  // Focal points are relative to the view's center, matching the center-origin scale transform.
  const pinch = usePinchGesture({
    onActivate: (e) => {
      'worklet';
      focalX.value = e.focalX - width.value / 2;
      focalY.value = e.focalY - height.value / 2;
    },
    onUpdate: (e) => {
      'worklet';
      const fx = e.focalX - width.value / 2;
      const fy = e.focalY - height.value / 2;
      const k = e.scaleChange;
      scale.value *= k;
      // Keep the content under the fingers in place while zooming, and follow two-finger drags.
      tx.value = fx - (focalX.value - tx.value) * k;
      ty.value = fy - (focalY.value - ty.value) * k;
      focalX.value = fx;
      focalY.value = fy;
    },
    onDeactivate: () => {
      'worklet';
      settle();
    },
  });

  // Disabled while not zoomed so one-finger swipes reach the surrounding pager.
  const pan = usePanGesture({
    enabled: zoomed,
    onUpdate: (e) => {
      'worklet';
      if (e.numberOfPointers > 1 || scale.value <= 1) return;
      tx.value += e.changeX;
      ty.value += e.changeY;
    },
    onDeactivate: (e) => {
      'worklet';
      if (scale.value <= 1 || scale.value > MAX_SCALE) {
        settle();
        return;
      }
      const maxX = (width.value * (scale.value - 1)) / 2;
      const maxY = (height.value * (scale.value - 1)) / 2;
      tx.value = withDecay({ velocity: e.velocityX, clamp: [-maxX, maxX] });
      ty.value = withDecay({ velocity: e.velocityY, clamp: [-maxY, maxY] });
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: (e) => {
      'worklet';
      if (scale.value > 1) {
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        return;
      }
      const s = DOUBLE_TAP_SCALE;
      const maxX = (width.value * (s - 1)) / 2;
      const maxY = (height.value * (s - 1)) / 2;
      const fx = e.x - width.value / 2;
      const fy = e.y - height.value / 2;
      scale.value = withTiming(s);
      tx.value = withTiming(Math.min(Math.max(-fx * (s - 1), -maxX), maxX));
      ty.value = withTiming(Math.min(Math.max(-fy * (s - 1), -maxY), maxY));
    },
  });

  const singleTap = useTapGesture({
    runOnJS: true,
    onActivate: () => {
      if (scale.value <= 1) onTap?.();
    },
  });

  const taps = useExclusiveGestures(doubleTap, singleTap);
  const gesture = useSimultaneousGestures(pinch, pan, taps);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.container}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width;
          height.value = e.nativeEvent.layout.height;
        }}
      >
        <Animated.Image source={{ uri }} style={[StyleSheet.absoluteFill, imageStyle]} resizeMode="contain" />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
