export type AccountTier = 'guest' | 'pro';

export type ProductAccess = {
  canCompareCombinations: boolean;
  canSaveNumbers: boolean;
  canUseBalancedPreset: boolean;
  canUseAiExplanation: boolean;
  canUseCustomPeriod: boolean;
  combinationSelectionLimit: number;
  conditionSelectionLimit: number | null;
  requiresRewardedAdForResults: boolean;
  storageMode: 'cloud' | 'device' | 'unavailable';
  tier: AccountTier;
};

export const GUEST_COMBINATION_SELECTION_LIMIT = 2;
export const PRO_COMBINATION_SELECTION_LIMIT = 5;
export const GUEST_CONDITION_SELECTION_LIMIT = 2;

export function accountTier({
  authenticated,
  isPro,
}: {
  authenticated: boolean;
  isPro: boolean;
}): AccountTier {
  if (authenticated && isPro) return 'pro';
  return 'guest';
}

export function productAccessFor(tier: AccountTier): ProductAccess {
  const isPro = tier === 'pro';
  return {
    canCompareCombinations: isPro,
    canSaveNumbers: true,
    canUseBalancedPreset: isPro,
    canUseAiExplanation: isPro,
    canUseCustomPeriod: isPro,
    combinationSelectionLimit: isPro
      ? PRO_COMBINATION_SELECTION_LIMIT
      : GUEST_COMBINATION_SELECTION_LIMIT,
    conditionSelectionLimit: isPro ? null : GUEST_CONDITION_SELECTION_LIMIT,
    requiresRewardedAdForResults: !isPro,
    storageMode: isPro ? 'cloud' : 'device',
    tier,
  };
}
