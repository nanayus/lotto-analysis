import {
  getAnalytics,
  logEvent as logFirebaseEvent,
  logScreenView,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';

import {
  analyticsCollectionEnabled,
  analyticsScreenName,
  compactAnalyticsParams,
  type AnalyticsEventName,
  type AnalyticsParams,
} from './events';

let initialized = false;

function analyticsInstance() {
  if (!analyticsCollectionEnabled()) return null;
  const analytics = getAnalytics();
  if (!initialized) {
    initialized = true;
    void setAnalyticsCollectionEnabled(analytics, true).catch(() => undefined);
  }
  return analytics;
}

export function trackEvent(name: AnalyticsEventName, params: AnalyticsParams = {}) {
  try {
    const analytics = analyticsInstance();
    if (!analytics) return;
    logFirebaseEvent(analytics, name, compactAnalyticsParams(params));
  } catch {
    // Analytics must never interrupt the product flow.
  }
}

export function trackScreen(pathname: string) {
  try {
    const analytics = analyticsInstance();
    if (!analytics) return;
    const screenName = analyticsScreenName(pathname);
    void logScreenView(analytics, {
      screen_class: screenName,
      screen_name: screenName,
    }).catch(() => undefined);
  } catch {
    // Analytics must never interrupt navigation.
  }
}
