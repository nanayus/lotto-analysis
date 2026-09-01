export type AccountTier = 'guest' | 'free' | 'pro';

export type ProductAccess = {
  canCompareCombinations: boolean;
  canSaveNumbers: boolean;
  canUseAiExplanation: boolean;
  canUseCustomPeriod: boolean;
  combinationSelectionLimit: number;
  requiresRewardedAdForResults: boolean;
  storageMode: 'cloud' | 'device' | 'unavailable';
  tier: AccountTier;
};

export const GUEST_COMBINATION_SELECTION_LIMIT = 2;
export const MEMBER_COMBINATION_SELECTION_LIMIT = 5;

export function accountTier({
  authenticated,
  isPro,
}: {
  authenticated: boolean;
  isPro: boolean;
}): AccountTier {
  if (authenticated && isPro) return 'pro';
  return authenticated ? 'free' : 'guest';
}

export function productAccessFor(tier: AccountTier): ProductAccess {
  const isPro = tier === 'pro';
  const authenticated = tier !== 'guest';
  return {
    canCompareCombinations: isPro,
    canSaveNumbers: authenticated,
    canUseAiExplanation: isPro,
    canUseCustomPeriod: isPro,
    combinationSelectionLimit: authenticated
      ? MEMBER_COMBINATION_SELECTION_LIMIT
      : GUEST_COMBINATION_SELECTION_LIMIT,
    requiresRewardedAdForResults: !isPro,
    storageMode: isPro ? 'cloud' : authenticated ? 'device' : 'unavailable',
    tier,
  };
}
