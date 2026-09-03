/**
 * 계정 연결 UI를 다시 운영할 때 환경 변수만 true로 바꾸면 기존 흐름이 복구됩니다.
 * 익명 인증 자체는 구매 권한 식별을 위해 계속 사용합니다.
 */
export const ACCOUNT_LINKING_ENABLED = process.env.EXPO_PUBLIC_ACCOUNT_LINKING_ENABLED === 'true';
