/** 계정 연결 UI를 다시 운영할 때 기존 흐름을 복구합니다. */
export const ACCOUNT_LINKING_ENABLED = process.env.EXPO_PUBLIC_ACCOUNT_LINKING_ENABLED === 'true';

/**
 * 서버 권한이나 구매 사용자 식별이 다시 필요할 때 익명 인증을 복구합니다.
 * false이면 Firebase가 설정되어 있어도 앱 시작 시 익명 계정을 만들지 않습니다.
 */
export const ANONYMOUS_AUTH_ENABLED = process.env.EXPO_PUBLIC_ANONYMOUS_AUTH_ENABLED === 'true';
