import { describe, expect, test } from '@jest/globals';

import { accountTier, productAccessFor } from '../policy';

describe('membership tier policy', () => {
  test('gives guests the configured condition allowance with device storage', () => {
    expect(productAccessFor('guest')).toMatchObject({
      canSaveNumbers: true,
      canUseBalancedPreset: false,
      combinationSelectionLimit: 2,
      conditionSelectionLimit: 99,
      requiresRewardedAdForResults: true,
      storageMode: 'device',
    });
  });

  test('gives Pro advanced analysis, cloud storage, and ad-free results', () => {
    expect(productAccessFor('pro')).toMatchObject({
      canRegenerateWithSameConditions: true,
      canSaveNumbers: true,
      canUseAiExplanation: true,
      canUseBalancedPreset: true,
      canUseCustomPeriod: true,
      combinationSelectionLimit: 5,
      conditionSelectionLimit: null,
      requiresRewardedAdForResults: false,
      storageMode: 'cloud',
    });
  });

  test('does not allow a guest-shaped Pro tier', () => {
    expect(accountTier({ authenticated: false, isPro: true })).toBe('guest');
  });

  test('unlocks every product feature while preserving guest device storage', () => {
    expect(productAccessFor('guest', { unlockAllFeatures: true })).toMatchObject({
      canRegenerateWithSameConditions: true,
      canUseAiExplanation: true,
      canUseBalancedPreset: true,
      canUseCustomPeriod: true,
      combinationSelectionLimit: 5,
      conditionSelectionLimit: null,
      requiresRewardedAdForResults: false,
      storageMode: 'device',
      tier: 'guest',
    });
  });

  test('uses cloud storage after login during the open-access period', () => {
    expect(productAccessFor('guest', {
      authenticated: true,
      unlockAllFeatures: true,
    }).storageMode).toBe('cloud');
  });
});
