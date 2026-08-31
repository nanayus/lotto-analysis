import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';

import { useAuth } from '@/features/auth/AuthContext';
import { functions } from '@/features/auth/firebaseClient';

import { ProPaywallModal } from './ProPaywallModal';
import { ReferralCodeOnboardingModal } from './ReferralCodeOnboardingModal';
import type { AnalysisAuthorization, MonetizationAccessState } from './types';

export const REFERRAL_ONBOARDING_SEEN_KEY = 'lotto.referralOnboarding.seen.v1';
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
  isPaywallVisible: boolean;
  openPaywall: (source?: string) => void;
  paywallSource: string | null;
  refresh: () => Promise<void>;
  state: MonetizationState;
};

const fallbackValue: MonetizationValue = {
  applyReferral: async () => undefined,
  authorizeAnalysis: async (numbers) => ({
    accessState: {
      bonusAnalysisCredits: 0,
      canApplyReferralCode: false,
      inviteCode: '',
      isPro: false,
      nextWeeklyResetAt: '',
      proExpiresAt: null,
      rewardedUnlocksLimit: 3,
      rewardedUnlocksUsedThisWeek: 0,
      weeklyFreeAvailable: false,
    },
    combinationKey: [...numbers].sort((left, right) => left - right).join('-'),
    decision: 'REWARD_OR_PRO_REQUIRED',
  }),
  closePaywall: () => undefined,
  isPaywallVisible: false,
  openPaywall: () => undefined,
  paywallSource: null,
  refresh: async () => undefined,
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
  const [isReferralPromptChecked, setReferralPromptChecked] = useState(false);
  const [hasSeenReferralPrompt, setHasSeenReferralPrompt] = useState(false);
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
      setState({ access: result.data, status: 'ready' });
    } catch (error) {
      setState({ error: messageForError(error), status: 'error' });
    }
  }, [authState.status]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const authorizeAnalysis = useCallback(async (
    numbers: readonly number[],
    dataVersion: string,
  ) => {
    if (authState.status !== 'authenticated' || !functions) {
      throw new Error('로그인과 Firebase Functions 연결이 필요해요.');
    }
    const authorize = httpsCallable<
      { dataVersion: string; numbers: readonly number[] },
      AnalysisAuthorization
    >(functions, 'authorizeCombinationAnalysis');
    const result = await authorize({ dataVersion, numbers });
    setState({ access: result.data.accessState, status: 'ready' });
    return result.data;
  }, [authState.status]);

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

  const finishReferralOnboarding = useCallback(async () => {
    setHasSeenReferralPrompt(true);
    setPendingReferralCode('');
    setReferralPromptError(null);
    await Promise.all([
      AsyncStorage.setItem(REFERRAL_ONBOARDING_SEEN_KEY, '1'),
      AsyncStorage.removeItem(REFERRAL_ONBOARDING_PENDING_KEY),
    ]).catch(() => undefined);
  }, []);

  const applyOnboardingReferral = useCallback(async (code: string) => {
    if (referralApplicationInFlight.current) return;
    referralApplicationInFlight.current = true;
    setApplyingReferral(true);
    setReferralPromptError(null);
    try {
      await applyReferral(code);
      await finishReferralOnboarding();
    } catch (error) {
      setReferralPromptError((error as Error).message);
    } finally {
      referralApplicationInFlight.current = false;
      setApplyingReferral(false);
    }
  }, [applyReferral, finishReferralOnboarding]);

  const submitOnboardingReferral = useCallback((code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    setPendingReferralCode(normalizedCode);
    setReferralPromptError(null);
    void AsyncStorage.setItem(REFERRAL_ONBOARDING_PENDING_KEY, normalizedCode).catch(() => undefined);
    if (authState.status !== 'authenticated') {
      openLogin();
      return;
    }
    void applyOnboardingReferral(normalizedCode);
  }, [applyOnboardingReferral, authState.status, openLogin]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      AsyncStorage.getItem(REFERRAL_ONBOARDING_SEEN_KEY),
      AsyncStorage.getItem(REFERRAL_ONBOARDING_PENDING_KEY),
    ]).then(([seen, pending]) => {
      if (!active) return;
      setHasSeenReferralPrompt(seen === '1');
      setPendingReferralCode(pending ?? '');
    }).catch(() => undefined).finally(() => {
      if (active) setReferralPromptChecked(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReferralPromptChecked || hasSeenReferralPrompt) return;
    if (authState.status === 'guest') return;
    if (authState.status !== 'authenticated' || state.status !== 'ready') return;
    if (state.access.canApplyReferralCode) return;
    queueMicrotask(() => void finishReferralOnboarding());
  }, [
    authState.status,
    finishReferralOnboarding,
    hasSeenReferralPrompt,
    isReferralPromptChecked,
    state,
  ]);

  useEffect(() => {
    if (
      !pendingReferralCode
      || hasSeenReferralPrompt
      || authState.status !== 'authenticated'
      || state.status !== 'ready'
    ) return;
    if (!state.access.canApplyReferralCode) {
      queueMicrotask(() => void finishReferralOnboarding());
      return;
    }
    queueMicrotask(() => void applyOnboardingReferral(pendingReferralCode));
  }, [
    applyOnboardingReferral,
    authState.status,
    finishReferralOnboarding,
    hasSeenReferralPrompt,
    pendingReferralCode,
    state,
  ]);

  const openPaywall = useCallback((source?: string) => {
    setPaywallSource(source ?? null);
    setPaywallVisible(true);
  }, []);
  const closePaywall = useCallback(() => setPaywallVisible(false), []);
  const isReferralPromptVisible = isReferralPromptChecked
    && !hasSeenReferralPrompt
    && (
      authState.status === 'guest'
      || pendingReferralCode.length > 0
      || (
        authState.status === 'authenticated'
        && state.status === 'ready'
        && state.access.canApplyReferralCode
      )
    );

  const value = useMemo<MonetizationValue>(() => ({
    applyReferral,
    authorizeAnalysis,
    closePaywall,
    isPaywallVisible,
    openPaywall,
    paywallSource,
    refresh,
    state,
  }), [applyReferral, authorizeAnalysis, closePaywall, isPaywallVisible, openPaywall, paywallSource, refresh, state]);

  return (
    <MonetizationContext.Provider value={value}>
      {children}
      <ProPaywallModal onClose={closePaywall} visible={isPaywallVisible} />
      <ReferralCodeOnboardingModal
        error={referralPromptError}
        isApplying={isApplyingReferral}
        onApply={submitOnboardingReferral}
        onSkip={() => void finishReferralOnboarding()}
        requiresLogin={authState.status !== 'authenticated'}
        visible={isReferralPromptVisible}
      />
    </MonetizationContext.Provider>
  );
}

export function useMonetization() {
  return useContext(MonetizationContext);
}
