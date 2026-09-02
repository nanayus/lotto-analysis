import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAnalytics,
  isSupported,
  logEvent as logFirebaseEvent,
  type Analytics,
} from 'firebase/analytics';

import { firebaseConfig, isAnalyticsConfigured } from '@/features/auth/firebaseConfig';

import {
  analyticsCollectionEnabled,
  analyticsScreenName,
  compactAnalyticsParams,
  type AnalyticsEventName,
  type AnalyticsParams,
} from './events';

let analyticsPromise: Promise<Analytics | null> | null = null;

function loadAnalytics() {
  if (!analyticsCollectionEnabled() || !isAnalyticsConfigured || typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  analyticsPromise ??= isSupported()
    .then((supported) => {
      if (!supported) return null;
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      return getAnalytics(app);
    })
    .catch(() => null);
  return analyticsPromise;
}

export function trackEvent(name: AnalyticsEventName, params: AnalyticsParams = {}) {
  void loadAnalytics().then((analytics) => {
    if (!analytics) return;
    logFirebaseEvent(analytics, name, compactAnalyticsParams(params));
  }).catch(() => undefined);
}

export function trackScreen(pathname: string) {
  const screenName = analyticsScreenName(pathname);
  void loadAnalytics().then((analytics) => {
    if (!analytics) return;
    logFirebaseEvent(analytics, 'screen_view', {
      firebase_screen: screenName,
      firebase_screen_class: screenName,
      page_path: pathname,
    });
  }).catch(() => undefined);
}
