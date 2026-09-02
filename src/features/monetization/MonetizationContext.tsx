import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';

import { trackEvent } from '@/features/analytics/analyticsClient';
import { useAuth } from '@/features/auth/AuthContext';
import { functions } from '@/features/auth/firebaseClient';
import { LoginModal } from '@/features/auth/LoginModal';

import { ProPaywallModal } from './ProPaywallModal';
import { ReferralCodeOnboardingModal } from './ReferralCodeOnboardingModal';
import { ALL_FEATURES_UNLOCKED, PRO_PLAN_ENABLED } from './featureFlags';
import {
  normalizeMonetizationAccessState,
  type AnalysisAuthorization,
  type MonetizationAccessState,
} from './types';
import { accountTier, productAccessFor, type ProductAccess } from './policy';

export const REFERRAL_ONBOARDING_PENDING_KEY = 'lotto.referralOnboarding.pending.v1';

type MonetizationState =
  | { status: 'guest' }
  | { status: 'loading' }
  | { error: string; status: 'error' }
  | { access: MonetizationAccessState; status: 'ready' };

type MonetizationValue = {
  applyReferral: (code: string) => Promise<void>;
  authorizeAnalysis: (numbers: readonly number[], dataVersion: string) => Promise<AnalysisAuthorization>;
  closePaywall: () => void;
  closeReferralCode: () => void;
  isPaywallVisible: boolean;
  isReferralCodeVisible: boolean;
  openPaywall: (source?: string) => void;
  openReferralCode: () => void;
  paywallSource: string | null;
  proPlanEnabled: boolean;
  productAccess: ProductAccess;
  refresh: () => Promise<void>;
  rewardedAdsAvailable: boolean;
  showRewardedAd: () => Promise<boolean>;
  state: MonetizationState;
};

const rewardedAdTestFallbackAvailable = Platform.OS === 'web' || __DEV__;

const EMPTY_ACCESS_STATE: MonetizationAccessState = {
  canApplyReferralCode: false,
  inviteCode: '',
  isPro: false,
  proExpiresAt: null,
};

const fallbackValue: MonetizationValue = {
  applyReferral: async () => undefined,
  authorizeAnalysis: async (numbers) => ({
    accessState: EMPTY_ACCESS_STATE,
    combinationKey: [...numbers].sort((left, right) => left - right).join('-'),
    decision: PRO_PLAN_ENABLED ? 'REWARD_OR_PRO_REQUIRED' : 'AUTHORIZED_PRO',
  }),
  closePaywall: () => undefined,
  closeReferralCode: () => undefined,
  isPaywallVisible: false,
  isReferralCodeVisible: false,
  openPaywall: () => undefined,
  openReferralCode: () => undefined,
  paywallSource: null,
  proPlanEnabled: PRO_PLAN_ENABLED,
  productAccess: productAccessFor('guest', { unlockAllFeatures: ALL_FEATURES_UNLOCKED }),
  refresh: async () => undefined,
  rewardedAdsAvailable: false,
  showRewardedAd: async () => false,
  state: { status: 'guest' },
};

const MonetizationContext = createContext<MonetizationValue>(fallbackValue);

function messageForError(error: unknown) {
  if (!error || typeof error !== 'object') return '이용 정보를 불러오지 못했어요.';
  const code = 'code' in error ? String(error.code) : '';
  const serverMessage = 'message' in error && typeof error.message === 'string'
    ? error.message
    : null;
  if (code.includes('unauthenticated')) return '로그인 후 다시 시도해 주세요.';
  if (code.includes('already-exists')) return '이미 초대 코드가 적용되어 있어요.';
  if (code.includes('not-found')) return '초대 코드를 찾을 수 없어요.';
  if (code.includes('failed-precondition')) return serverMessage ?? '초대 코드를 적용할 수 없어요.';
  if (code.includes('network')) return '네트워크 연결을 확인해 주세요.';
  if (serverMessage) return serverMessage;
  return '이용 정보를 처리하지 못했어요.';
}

export function MonetizationProvider({ children }: PropsWithChildren) {
  const { openLogin, state: authState } = useAuth();
  const [state, setState] = useState<MonetizationState>({ status: 'guest' });
  const [isPaywallVisible, setPaywallVisible] = useState(false);
  const [paywallSource, setPaywallSource] = useState<string | null>(null);
  const [isReferralCodeVisible, setReferralCodeVisible] = useState(false);
  const [pendingReferralCode, setPendingReferralCode] = useState('');
  const [referralPromptError, setReferralPromptError] = useState<string | null>(null);
  const [isApplyingReferral, setApplyingReferral] = useState(false);
  const referralApplicationInFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (authState.status !== 'authenticated') {
      setState({ status: authState.status === 'loading' ? 'loading' : 'guest' });
      return;
    }
    if (!functions) {
      setState({ error: 'Firebase Functions 연결 정보가 필요해요.', status: 'error' });
      return;
    }
    setState((current) => current.status === 'ready' ? current : { status: 'loading' });
    try {
      const getAccessState = httpsCallable<Record<string, never>, MonetizationAccessState>(
        functions,
        'getMonetizationAccessState',
      );
      const result = await getAccessState({});
      setState({ access: normalizeMonetizationAccessState(result.data), status: 'ready' });
    } catch (error) {
      setState({ error: messageForError(error), status: 'error' });
    }
  }, [authState.status]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const authorizeAnalysis = useCallback(async (
    numbers: readonly number[],
    _dataVersion: string,
  ) => {
    const combinationKey = [...numbers].sort((left, right) => left - right).join('-');
    const accessState = state.status === 'ready' ? state.access : EMPTY_ACCESS_STATE;
    return {
      accessState,
      combinationKey,
      decision: (!PRO_PLAN_ENABLED || accessState.isPro)
        ? 'AUTHORIZED_PRO' as const
        : 'REWARD_OR_PRO_REQUIRED' as const,
    };
  }, [state]);

  const applyReferral = useCallback(async (code: string) => {
    if (authState.status !== 'authenticated' || !functions) {
      throw new Error('로그인과 Firebase Functions 연결이 필요해요.');
    }
    const apply = httpsCallable<{ code: string }, { applied: boolean }>(functions, 'applyReferralCode');
    try {
      await apply({ code });
      await refresh();
    } catch (error) {
      throw new Error(messageForError(error));
    }
  }, [authState.status, refresh]);

  const finishReferralCode = useCallback(async () => {
    setPendingReferralCode('');
    setReferralPromptError(null);
    setReferralCodeVisible(false);
    await AsyncStorage.removeItem(REFERRAL_ONBOARDING_PENDING_KEY).catch(() => undefined);
  }, []);

  const applyOnboardingReferral = useCallback(async (code: string) => {
    if (referralApplicationInFlight.current) return;
    referralApplicationInFlight.current = true;
    setApplyingReferral(true);
    setReferralPromptError(null);
    try {
      await applyReferral(code);
      await finishReferralCode();
    } catch (error) {
      setReferralPromptError((error as Error).message);
      setReferralCodeVisible(true);
    } finally {
      referralApplicationInFlight.current = false;
      setApplyingReferral(false);
    }
  }, [applyReferral, finishReferralCode]);

  const submitOnboardingReferral = useCallback((code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    setPendingReferralCode(normalizedCode);
    setReferralPromptError(null);
    void AsyncStorage.setItem(REFERRAL_ONBOARDING_PENDING_KEY, normalizedCode).catch(() => undefined);
    if (authState.status !== 'authenticated') {
      setReferralCodeVisible(false);
      openLogin('referral-code');
      return;
    }
    void applyOnboardingReferral(normalizedCode);
  }, [applyOnboardingReferral, authState.status, openLogin]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(REFERRAL_ONBOARDING_PENDING_KEY)
      .then((pending) => {
        if (active) setPendingReferralCode(pending ?? '');
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (
      !pendingReferralCode
      || authState.status !== 'authenticated'
      || state.status !== 'ready'
    ) return;
    if (!state.access.canApplyReferralCode) {
      queueMicrotask(() => void finishReferralCode());
      return;
    }
    queueMicrotask(() => void applyOnboardingReferral(pendingReferralCode));
  }, [
    applyOnboardingReferral,
    authState.status,
    finishReferralCode,
    pendingReferralCode,
    state,
  ]);

  const openPaywall = useCallback((source?: string) => {
    if (!PRO_PLAN_ENABLED) return;
    setPaywallSource(source ?? null);
    setPaywallVisible(true);
    trackEvent('paywall_viewed', { source: source ?? 'unspecified' });
  }, []);
  const closePaywall = useCallback(() => {
    setPaywallVisible(false);
    trackEvent('paywall_closed', { source: paywallSource ?? 'unspecified' });
  }, [paywallSource]);
  const openReferralCode = useCallback(() => {
    setReferralPromptError(null);
    setReferralCodeVisible(true);
  }, []);
  const closeReferralCode = useCallback(() => {
    if (isApplyingReferral) return;
    setReferralPromptError(null);
    setReferralCodeVisible(false);
  }, [isApplyingReferral]);
  const showRewardedAd = useCallback(async () => {
    if (!rewardedAdTestFallbackAvailable) return false;
    // Native AdMob 연결 전에도 웹과 개발 빌드에서 결과 공개 흐름을 끝까지 검증한다.
    await new Promise((resolve) => setTimeout(resolve, 650));
    return true;
  }, []);
  const tier = accountTier({
    authenticated: authState.status === 'authenticated',
    isPro: state.status === 'ready' && state.access.isPro,
  });
  const productAccess = productAccessFor(tier, {
    authenticated: authState.status === 'authenticated',
    unlockAllFeatures: ALL_FEATURES_UNLOCKED,
  });

  const value = useMemo<MonetizationValue>(() => ({
    applyReferral,
    authorizeAnalysis,
    closePaywall,
    closeReferralCode,
    isPaywallVisible,
    isReferralCodeVisible,
    openPaywall,
    openReferralCode,
    paywallSource,
    proPlanEnabled: PRO_PLAN_ENABLED,
    productAccess,
    refresh,
    rewardedAdsAvailable: PRO_PLAN_ENABLED && rewardedAdTestFallbackAvailable,
    showRewardedAd,
    state,
  }), [
    applyReferral,
    authorizeAnalysis,
    closePaywall,
    closeReferralCode,
    isPaywallVisible,
    isReferralCodeVisible,
    openPaywall,
    openReferralCode,
    paywallSource,
    productAccess,
    refresh,
    showRewardedAd,
    state,
  ]);

  return (
    <MonetizationContext.Provider value={value}>
      {children}
      <LoginModal />
      {PRO_PLAN_ENABLED ? (
        <ProPaywallModal
          onClose={closePaywall}
          source={paywallSource}
          visible={isPaywallVisible}
        />
      ) : null}
      <ReferralCodeOnboardingModal
        error={referralPromptError}
        isApplying={isApplyingReferral}
        onApply={submitOnboardingReferral}
        onClose={closeReferralCode}
        requiresLogin={authState.status !== 'authenticated'}
        visible={isReferralCodeVisible}
      />
    </MonetizationContext.Provider>
  );
}

export function useMonetization() {
  return useContext(MonetizationContext);
}
