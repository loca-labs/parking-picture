// Type for `import RecentPhotosWidget from './RecentPhotosWidget'`.
// Metro picks RecentPhotosWidget.ios.tsx / .android.tsx / .web.ts at bundle time.
// Don't add a plain RecentPhotosWidget.ts(x): Metro would resolve it before the
// platform files (it tries `.ios.ts`, `.native.ts`, `.ts` before any `.tsx`).
import type { Widget } from 'expo-widgets';

import type { RecentPhotosProps } from './types';

declare const RecentPhotosWidget: Widget<RecentPhotosProps> | null;
export default RecentPhotosWidget;
