import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  PACKAGE_TYPE,
} from 'react-native-purchases';

import type {
  RevenueCatPackage,
  RevenueCatSnapshot,
} from './revenueCatClient';

const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || 'pro';
const API_KEY = Platform.select({
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
})?.trim();

let configured = false;
let configuredUserId: string | null = null;
let availablePackages: PurchasesPackage[] = [];

function packageKind(item: PurchasesPackage): RevenueCatPackage['kind'] {
  if (item.packageType === PACKAGE_TYPE.ANNUAL) return 'annual';
  if (item.packageType === PACKAGE_TYPE.MONTHLY) return 'monthly';
  return 'other';
}

function publicPackage(item: PurchasesPackage): RevenueCatPackage {
  return {
    currencyCode: item.product.currencyCode,
    identifier: item.identifier,
    kind: packageKind(item),
    price: item.product.price,
    priceString: item.product.priceString,
    productIdentifier: item.product.identifier,
    title: item.product.title,
  };
}

function snapshotFor(customerInfo: CustomerInfo): RevenueCatSnapshot {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  return {
    configured: true,
    expiresAt: entitlement?.expirationDate ?? null,
    isPro: Boolean(entitlement?.isActive),
    managementUrl: customerInfo.managementURL,
    packages: availablePackages.map(publicPackage),
  };
}

async function refreshSnapshot(customerInfo?: CustomerInfo): Promise<RevenueCatSnapshot> {
  const [infoResult, offeringsResult] = await Promise.allSettled([
    customerInfo ? Promise.resolve(customerInfo) : Purchases.getCustomerInfo(),
    Purchases.getOfferings(),
  ]);
  if (offeringsResult.status === 'fulfilled') {
    availablePackages = offeringsResult.value.current?.availablePackages ?? [];
  }
  if (infoResult.status === 'rejected') throw infoResult.reason;
  return snapshotFor(infoResult.value);
}

export async function initializeRevenueCat(appUserId: string): Promise<RevenueCatSnapshot> {
  if (!API_KEY) {
    return {
      configured: false,
      expiresAt: null,
      isPro: false,
      managementUrl: null,
      packages: [],
    };
  }

  if (!configured) {
    Purchases.configure({
      apiKey: API_KEY,
      appUserID: appUserId,
      automaticDeviceIdentifierCollectionEnabled: false,
    });
    configured = true;
    configuredUserId = appUserId;
  } else if (configuredUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredUserId = appUserId;
  }

  return refreshSnapshot();
}

export async function purchaseRevenueCatPackage(identifier: string) {
  const selectedPackage = availablePackages.find((item) => item.identifier === identifier);
  if (!selectedPackage) throw new Error('선택한 구독 상품을 찾을 수 없어요.');
  const result = await Purchases.purchasePackage(selectedPackage);
  return refreshSnapshot(result.customerInfo);
}

export async function restoreRevenueCatPurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return refreshSnapshot(customerInfo);
}

export function subscribeToRevenueCat(listener: (snapshot: RevenueCatSnapshot) => void) {
  if (!configured) return () => undefined;
  const handleUpdate = (customerInfo: CustomerInfo) => listener(snapshotFor(customerInfo));
  Purchases.addCustomerInfoUpdateListener(handleUpdate);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(handleUpdate);
  };
}
