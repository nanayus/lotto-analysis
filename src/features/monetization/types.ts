export type MonetizationAccessState = {
  bonusAnalysisCredits: number;
  canApplyReferralCode: boolean;
  inviteCode: string;
  isPro: boolean;
  nextWeeklyResetAt: string;
  proExpiresAt: string | null;
  rewardedUnlocksLimit: number;
  rewardedUnlocksUsedThisWeek: number;
  weeklyFreeAvailable: boolean;
};

export type AnalysisAuthorizationDecision =
  | 'UNLOCKED_EXISTING'
  | 'AUTHORIZED_PRO'
  | 'AUTHORIZED_WEEKLY'
  | 'AUTHORIZED_CREDIT'
  | 'REWARD_OR_PRO_REQUIRED';

export type AnalysisAuthorization = {
  accessState: MonetizationAccessState;
  combinationKey: string;
  decision: AnalysisAuthorizationDecision;
};

export function isAnalysisAuthorized(decision: AnalysisAuthorizationDecision) {
  return decision !== 'REWARD_OR_PRO_REQUIRED';
}
