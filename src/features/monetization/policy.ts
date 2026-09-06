export type AccountTier = 'guest' | 'pro';

export type ProductAccess = {
  canRegenerateWithSameConditions: boolean;
  canSaveNumbers: boolean;
  canUseBalancedPreset: boolean;
  canUseAiExplanation: boolean;
  canUseCustomPeriod: boolean;
  combinationSelectionLimit: number;
  conditionSelectionLimit: number | null;
  requiresAdForResults: boolean;
  storageMode: 'cloud' | 'device' | 'unavailable';
  tier: AccountTier;
};

export const GUEST_COMBINATION_SELECTION_LIMIT = 2;
export const PRO_COMBINATION_SELECTION_LIMIT = 5;
export const GUEST_CONDITION_SELECTION_LIMIT = 99;

type ProductAccessOptions = {
  linkedAccount?: boolean;
  requireAdsForResults?: boolean;
  unlockAllFeatures?: boolean;
};

export function accountTier({
  isPro,
}: {
  isPro: boolean;
}): AccountTier {
  return isPro ? 'pro' : 'guest';
}

export function productAccessFor(
  tier: AccountTier,
  {
    linkedAccount = false,
    requireAdsForResults = true,
    unlockAllFeatures = false,
  }: ProductAccessOptions = {},
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
    requiresAdForResults: requireAdsForResults && tier !== 'pro',
    storageMode: linkedAccount && hasFullAccess ? 'cloud' : 'device',
    tier,
  };
}
