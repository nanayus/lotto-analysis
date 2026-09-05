import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  InterstitialAd,
  TestIds,
} from 'react-native-google-mobile-ads';

const LOAD_TIMEOUT_MS = 20_000;
const adMobTestMode = process.env.EXPO_PUBLIC_ADMOB_TEST_MODE === 'true';
const interstitialAdUnitId = adMobTestMode
  ? TestIds.INTERSTITIAL
  : Platform.select({
      android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_AD_UNIT_ID?.trim(),
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_AD_UNIT_ID?.trim(),
    });

let initializationPromise: Promise<boolean> | null = null;
let loadingPromise: Promise<InterstitialAd> | null = null;
let loadedAd: InterstitialAd | null = null;
let showingPromise: Promise<boolean> | null = null;

export function isInterstitialAdConfigured() {
  return Boolean(interstitialAdUnitId);
}

async function initializeMobileAds() {
  if (!interstitialAdUnitId) return false;
  if (!initializationPromise) {
    initializationPromise = mobileAds()
      .initialize()
      .then(() => true)
      .catch(() => {
        initializationPromise = null;
        return false;
      });
  }
  return initializationPromise;
}

function loadInterstitialAd() {
  if (!interstitialAdUnitId) {
    return Promise.reject(new Error('AdMob interstitial ad is not configured.'));
  }

  const ad = InterstitialAd.createForAdRequest(interstitialAdUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  return new Promise<InterstitialAd>((resolve, reject) => {
    let settled = false;
    const finish = (result: { ad: InterstitialAd } | { error: Error }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubscribeLoaded();
      unsubscribeError();
      if ('ad' in result) resolve(result.ad);
      else reject(result.error);
    };
    const unsubscribeLoaded = ad.addAdEventListener(
      AdEventType.LOADED,
      () => finish({ ad }),
    );
    const unsubscribeError = ad.addAdEventListener(
      AdEventType.ERROR,
      (error) => finish({ error }),
    );
    const timeout = setTimeout(() => {
      finish({ error: new Error('Timed out while loading the interstitial ad.') });
    }, LOAD_TIMEOUT_MS);

    try {
      ad.load();
    } catch (error) {
      finish({ error: error instanceof Error ? error : new Error(String(error)) });
    }
  });
}

async function getLoadedInterstitialAd() {
  if (loadedAd?.loaded) return loadedAd;
  if (loadingPromise) return loadingPromise;

  const initialized = await initializeMobileAds();
  if (!initialized) throw new Error('Google Mobile Ads SDK could not be initialized.');

  loadingPromise = loadInterstitialAd();
  try {
    loadedAd = await loadingPromise;
    return loadedAd;
  } finally {
    loadingPromise = null;
  }
}

export async function prepareInterstitialAd() {
  if (!isInterstitialAdConfigured()) return false;
  try {
    await getLoadedInterstitialAd();
    return true;
  } catch {
    return false;
  }
}

async function presentInterstitialAd() {
  let ad: InterstitialAd;
  try {
    ad = await getLoadedInterstitialAd();
  } catch {
    return false;
  }

  loadedAd = null;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (shown: boolean) => {
      if (settled) return;
      settled = true;
      unsubscribeClosed();
      unsubscribeError();
      void prepareInterstitialAd();
      resolve(shown);
    };
    const unsubscribeClosed = ad.addAdEventListener(
      AdEventType.CLOSED,
      () => finish(true),
    );
    const unsubscribeError = ad.addAdEventListener(
      AdEventType.ERROR,
      () => finish(false),
    );

    void ad.show().catch(() => finish(false));
  });
}

export async function showInterstitialAd() {
  if (!isInterstitialAdConfigured()) return false;
  if (!showingPromise) {
    showingPromise = presentInterstitialAd().finally(() => {
      showingPromise = null;
    });
  }
  return showingPromise;
}
