import type { RevenueCatSnapshot } from './revenueCatClient';

const WEB_SNAPSHOT: RevenueCatSnapshot = {
  configured: false,
  expiresAt: null,
  isPro: false,
  managementUrl: null,
  packages: [],
};

export async function initializeRevenueCat() {
  return WEB_SNAPSHOT;
}

export async function purchaseRevenueCatPackage() {
  throw new Error('스토어 결제는 iOS와 Android 앱에서 이용할 수 있어요.');
}

export async function restoreRevenueCatPurchases() {
  throw new Error('구매 복원은 iOS와 Android 앱에서 이용할 수 있어요.');
}

export function subscribeToRevenueCat() {
  return () => undefined;
}
