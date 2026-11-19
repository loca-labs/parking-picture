import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const MINUTE = 60_000;

/**
 * Current time that re-renders once per minute, right after each whole minute counted from
 * `anchor` (e.g. a photo's capture time), so a relative label changes exactly when it should.
 * Also refreshes when the app comes back to the foreground (timers pause in the background).
 */
export function useMinuteClock(anchor: number | undefined): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (anchor == null) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      const t = Date.now();
      setNow(t);
      const next = anchor + (Math.floor((t - anchor) / MINUTE) + 1) * MINUTE;
      clearTimeout(timer);
      timer = setTimeout(tick, next - t + 50);
    };

    tick();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [anchor]);

  return now;
}
