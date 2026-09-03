export type RevenueCatPackageKind = 'annual' | 'monthly' | 'other';

export type RevenueCatPackage = {
  currencyCode: string;
  identifier: string;
  kind: RevenueCatPackageKind;
  price: number;
  priceString: string;
  productIdentifier: string;
  title: string;
};

export type RevenueCatSnapshot = {
  configured: boolean;
  expiresAt: string | null;
  isPro: boolean;
  managementUrl: string | null;
  packages: RevenueCatPackage[];
};

export function initializeRevenueCat(appUserId: string): Promise<RevenueCatSnapshot>;
export function purchaseRevenueCatPackage(identifier: string): Promise<RevenueCatSnapshot>;
export function restoreRevenueCatPurchases(): Promise<RevenueCatSnapshot>;
export function subscribeToRevenueCat(
  listener: (snapshot: RevenueCatSnapshot) => void,
): () => void;
