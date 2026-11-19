export type RecentPhoto = {
  /** `file://` URI of a downscaled copy inside `widgetsDirectory`. */
  uri: string;
  /** Capture time in ms since epoch. */
  takenAt: number;
};

export type RecentPhotosProps = {
  /** Newest first, at most 3. */
  photos: RecentPhoto[];
  /**
   * Re-render the widget this often (patched expo-widgets, iOS + Android) so the
   * relative time stays current.
   */
  refreshIntervalMs?: number;
  /** Align refreshes to `anchor + k * refreshIntervalMs` (the newest photo's capture time). */
  refreshAnchorMs?: number;
};
