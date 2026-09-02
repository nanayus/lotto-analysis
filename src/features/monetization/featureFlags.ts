/**
 * Pro 상품을 다시 운영할 때 이 환경 변수를 true로 바꾸면 기존 제한과 UI가 복구됩니다.
 * 현재 테스트/초기 운영에서는 모든 제품 기능을 공개합니다.
 */
export const PRO_PLAN_ENABLED = process.env.EXPO_PUBLIC_PRO_PLAN_ENABLED === 'true';

export const ALL_FEATURES_UNLOCKED = !PRO_PLAN_ENABLED;
