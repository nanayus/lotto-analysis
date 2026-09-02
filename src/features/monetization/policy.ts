export type AccountTier = 'guest' | 'pro';

export type ProductAccess = {
  canRegenerateWithSameConditions: boolean;
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
export const GUEST_CONDITION_SELECTION_LIMIT = 99;

type ProductAccessOptions = {
  authenticated?: boolean;
  unlockAllFeatures?: boolean;
};

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

export function productAccessFor(
  tier: AccountTier,
  { authenticated = false, unlockAllFeatures = false }: ProductAccessOptions = {},
): ProductAccess {
  const hasFullAccess = tier === 'pro' || unlockAllFeatures;
  return {
    canRegenerateWithSameConditions: hasFullAccess,
    canSaveNumbers: true,
    canUseBalancedPreset: hasFullAccess,
    canUseAiExplanation: hasFullAccess,
    canUseCustomPeriod: hasFullAccess,
    combinationSelectionLimit: hasFullAccess
      ? PRO_COMBINATION_SELECTION_LIMIT
      : GUEST_COMBINATION_SELECTION_LIMIT,
    conditionSelectionLimit: hasFullAccess ? null : GUEST_CONDITION_SELECTION_LIMIT,
    requiresRewardedAdForResults: !hasFullAccess,
    storageMode: (tier === 'pro' || (unlockAllFeatures && authenticated)) ? 'cloud' : 'device',
    tier,
  };
}
