import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

type AdListener = (payload?: Error) => void;

const mockAds: {
  addAdEventListener: (type: string, listener: AdListener) => () => void;
  load: () => void;
  loaded: boolean;
  show: () => Promise<void>;
}[] = [];
let mockShowError = false;

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({ initialize: jest.fn(() => Promise.resolve([])) }),
  AdEventType: { CLOSED: 'closed', ERROR: 'error', LOADED: 'loaded' },
  TestIds: { INTERSTITIAL: 'google-interstitial-test-id' },
  InterstitialAd: {
    createForAdRequest: jest.fn(() => {
      const listeners = new Map<string, Set<AdListener>>();
      const emit = (type: string, payload?: Error) => {
        listeners.get(type)?.forEach((listener) => listener(payload));
      };
      const ad = {
        addAdEventListener: (type: string, listener: AdListener) => {
          const typeListeners = listeners.get(type) ?? new Set<AdListener>();
          typeListeners.add(listener);
          listeners.set(type, typeListeners);
          return () => typeListeners.delete(listener);
        },
        load: () => {
          ad.loaded = true;
          emit('loaded');
        },
        loaded: false,
        show: async () => {
          ad.loaded = false;
          if (mockShowError) emit('error', new Error('show failed'));
          else emit('closed');
        },
      };
      mockAds.push(ad);
      return ad;
    }),
  },
}));

describe('interstitialAdClient.native', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    mockAds.length = 0;
    mockShowError = false;
    process.env.EXPO_PUBLIC_ADMOB_TEST_MODE = 'true';
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const loadClient = () => {
    let client: typeof import('../interstitialAdClient.native') | undefined;
    jest.isolateModules(() => {
      client = jest.requireActual<typeof import('../interstitialAdClient.native')>(
        '../interstitialAdClient.native',
      );
    });
    if (!client) throw new Error('Failed to load the interstitial ad client.');
    return client;
  };

  test('returns true after the interstitial closes', async () => {
    const client = loadClient();
    let settled = false;
    const result = client.showInterstitialAd().then((shown) => {
      settled = true;
      return shown;
    });

    await jest.advanceTimersByTimeAsync(client.AD_DISMISS_SETTLE_MS - 1);
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe(true);
    expect(mockAds[0]?.show).toBeDefined();
  });

  test('returns false when the interstitial cannot be shown', async () => {
    mockShowError = true;
    const client = loadClient();

    await expect(client.showInterstitialAd()).resolves.toBe(false);
  });
});
