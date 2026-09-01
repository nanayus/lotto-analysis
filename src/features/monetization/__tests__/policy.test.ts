import { describe, expect, test } from '@jest/globals';

import { accountTier, productAccessFor } from '../policy';

describe('membership tier policy', () => {
  test('keeps guests limited to two combinations without storage or balanced preset', () => {
    expect(productAccessFor('guest')).toMatchObject({
      canSaveNumbers: false,
      canUseBalancedPreset: false,
      combinationSelectionLimit: 2,
      conditionSelectionLimit: 2,
      requiresRewardedAdForResults: true,
      storageMode: 'unavailable',
    });
  });

  test('gives free members five combinations and conditions with device storage', () => {
    expect(productAccessFor('free')).toMatchObject({
      canCompareCombinations: false,
      canSaveNumbers: true,
      canUseAiExplanation: false,
      canUseBalancedPreset: false,
      canUseCustomPeriod: false,
      combinationSelectionLimit: 5,
      conditionSelectionLimit: 5,
      requiresRewardedAdForResults: true,
      storageMode: 'device',
    });
  });

  test('gives Pro advanced analysis, cloud storage, and ad-free results', () => {
    expect(productAccessFor('pro')).toMatchObject({
      canCompareCombinations: true,
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
});
