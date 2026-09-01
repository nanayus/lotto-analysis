export type MonetizationAccessState = {
  canApplyReferralCode: boolean;
  inviteCode: string;
  isPro: boolean;
  proExpiresAt: string | null;
};

export type AnalysisAuthorizationDecision =
  | 'AUTHORIZED_PRO'
  | 'REWARD_OR_PRO_REQUIRED';

export type AnalysisAuthorization = {
  accessState: MonetizationAccessState;
  combinationKey: string;
  decision: AnalysisAuthorizationDecision;
};

export function normalizeMonetizationAccessState(
  access: MonetizationAccessState,
): MonetizationAccessState {
  return {
    canApplyReferralCode: Boolean(access.canApplyReferralCode),
    inviteCode: typeof access.inviteCode === 'string' ? access.inviteCode : '',
    isPro: Boolean(access.isPro),
    proExpiresAt: typeof access.proExpiresAt === 'string' ? access.proExpiresAt : null,
  };
}

export function isAnalysisAuthorized(decision: AnalysisAuthorizationDecision) {
  return decision === 'AUTHORIZED_PRO';
}
