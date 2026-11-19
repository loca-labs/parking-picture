import { useCallback, useEffect } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

const SHUTTER_SOUND = require('../../assets/sounds/shutter-soft.wav');

/** Plays a short, soft shutter tone instead of the system camera click. */
export function useSoftShutterSound() {
  const player = useAudioPlayer(SHUTTER_SOUND);

  useEffect(() => {
    player.volume = 0.5;
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  }, [player]);

  return useCallback(() => {
    player.seekTo(0);
    player.play();
  }, [player]);
}