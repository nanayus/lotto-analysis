/**
 * Pro 상품을 다시 운영할 때 이 환경 변수를 true로 바꾸면 기존 제한과 UI가 복구됩니다.
 * 현재 테스트/초기 운영에서는 모든 제품 기능을 공개합니다.
 */
export const PRO_PLAN_ENABLED = process.env.EXPO_PUBLIC_PRO_PLAN_ENABLED === 'true';

/**
 * Pro 판매와 별개로 결과 진입 전 광고를 운영합니다.
 * 광고 SDK 또는 광고 단위가 준비되지 않은 환경에서는 결과를 막지 않습니다.
 */
export const RESULT_ADS_ENABLED = process.env.EXPO_PUBLIC_RESULT_ADS_ENABLED === 'true';

export const ALL_FEATURES_UNLOCKED = !PRO_PLAN_ENABLED;
