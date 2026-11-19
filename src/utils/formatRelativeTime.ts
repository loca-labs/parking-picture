/**
 * Minute-precision age, e.g. "< 1 min", "5 min", "2 hr, 5 min", "1 day, 2 hr".
 * The widgets (src/widgets/*) use the same wording but can't import this file
 * (widget code runs in its own runtime), so keep them in sync.
 */
export function formatRelativeTime(takenAt: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - takenAt) / 60000));
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} hr, ${minutes % 60} min` : `${hours} hr`;
  const days = Math.floor(hours / 24);
  const dayLabel = days === 1 ? '1 day' : `${days} days`;
  return hours % 24 ? `${dayLabel}, ${hours % 24} hr` : dayLabel;
}
