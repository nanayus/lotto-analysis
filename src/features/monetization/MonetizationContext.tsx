import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';

import { trackEvent } from '@/features/analytics/analyticsClient';
import { useAuth } from '@/features/auth/AuthContext';
import { functions } from '@/features/auth/firebaseClient';
import { LoginModal } from '@/features/auth/LoginModal';
import { authUid, hasLinkedAccount } from '@/features/auth/types';

import { ProPaywallModal } from './ProPaywallModal';
import { ReferralCodeOnboardingModal } from './ReferralCodeOnboardingModal';
import { ALL_FEATURES_UNLOCKED, PRO_PLAN_ENABLED } from './featureFlags';
import {
  normalizeMonetizationAccessState,
  type AnalysisAuthorization,
  type MonetizationAccessState,
} from './types';
import { accountTier, productAccessFor, type ProductAccess } from './policy';
import {
  initializeRevenueCat,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
  subscribeToRevenueCat,
  type RevenueCatPackage,
  type RevenueCatSnapshot,
} from './revenueCatClient';

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
  purchaseError: string | null;
  purchasePackage: (identifier: string) => Promise<boolean>;
  purchasePackages: RevenueCatPackage[];
  purchasesConfigured: boolean;
  isPurchaseWorking: boolean;
  proPlanEnabled: boolean;
  productAccess: ProductAccess;
  refresh: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  rewardedAdsAvailable: boolean;
  showRewardedAd: () => Promise<boolean>;
  state: MonetizationState;
  subscriptionManagementUrl: string | null;
};

const rewardedAdTestFallbackAvailable = Platform.OS === 'web' || __DEV__;

const EMPTY_ACCESS_STATE: MonetizationAccessState = {
  canApplyReferralCode: false,
  inviteCode: '',
  isPro: false,
  proExpiresAt: null,
};

const EMPTY_PURCHASE_SNAPSHOT: RevenueCatSnapshot = {
  configured: false,
  expiresAt: null,
  isPro: false,
  managementUrl: null,
  packages: [],
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
  purchaseError: null,
  purchasePackage: async () => false,
  purchasePackages: [],
  purchasesConfigured: false,
  isPurchaseWorking: false,
  proPlanEnabled: PRO_PLAN_ENABLED,
  productAccess: productAccessFor('guest', { unlockAllFeatures: ALL_FEATURES_UNLOCKED }),
  refresh: async () => undefined,
  restorePurchases: async () => false,
  rewardedAdsAvailable: false,
  showRewardedAd: async () => false,
  state: { status: 'guest' },
  subscriptionManagementUrl: null,
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
  const [purchaseSnapshot, setPurchaseSnapshot] = useState(EMPTY_PURCHASE_SNAPSHOT);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isPurchaseWorking, setPurchaseWorking] = useState(false);
  const [isPaywallVisible, setPaywallVisible] = useState(false);
  const [paywallSource, setPaywallSource] = useState<string | null>(null);
  const [isReferralCodeVisible, setReferralCodeVisible] = useState(false);
  const [pendingReferralCode, setPendingReferralCode] = useState('');
  const [referralPromptError, setReferralPromptError] = useState<string | null>(null);
  const [isApplyingReferral, setApplyingReferral] = useState(false);
  const referralApplicationInFlight = useRef(false);
  const activeUid = authUid(authState);

  const applyPurchaseSnapshot = useCallback((snapshot: RevenueCatSnapshot) => {
    setPurchaseSnapshot(snapshot);
    setState((current) => {
      if (current.status !== 'ready') return current;
      return {
        access: {
          ...current.access,
          isPro: snapshot.configured ? snapshot.isPro : current.access.isPro,
          proExpiresAt: snapshot.configured ? snapshot.expiresAt : current.access.proExpiresAt,
        },
        status: 'ready',
      };
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!activeUid) {
      setState({ status: authState.status === 'loading' ? 'loading' : 'guest' });
      return;
    }
    setState((current) => current.status === 'ready' ? current : { status: 'loading' });
    const serverAccessPromise = functions ? (async () => {
      const getAccessState = httpsCallable<Record<string, never>, MonetizationAccessState>(
        functions,
        'getMonetizationAccessState',
      );
      const result = await getAccessState({});
      return normalizeMonetizationAccessState(result.data);
    })() : Promise.resolve(EMPTY_ACCESS_STATE);
    const purchasePromise = PRO_PLAN_ENABLED
      ? initializeRevenueCat(activeUid)
      : Promise.resolve(EMPTY_PURCHASE_SNAPSHOT);
    const [serverResult, purchaseResult] = await Promise.allSettled([
      serverAccessPromise,
      purchasePromise,
    ]);
    if (serverResult.status === 'rejected' && purchaseResult.status === 'rejected') {
      setState({ error: messageForError(serverResult.reason), status: 'error' });
      setPurchaseError(messageForError(purchaseResult.reason));
      return;
    }
    const serverAccess = serverResult.status === 'fulfilled'
      ? serverResult.value
      : EMPTY_ACCESS_STATE;
    const purchases = purchaseResult.status === 'fulfilled'
      ? purchaseResult.value
      : EMPTY_PURCHASE_SNAPSHOT;
    setPurchaseSnapshot(purchases);
    if (purchaseResult.status === 'rejected') {
      setPurchaseError(messageForError(purchaseResult.reason));
    } else {
      setPurchaseError(null);
    }
    setState({
      access: {
        ...serverAccess,
        isPro: purchases.configured ? purchases.isPro : serverAccess.isPro,
        proExpiresAt: purchases.configured ? purchases.expiresAt : serverAccess.proExpiresAt,
      },
      status: 'ready',
    });
  }, [activeUid, authState.status]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  useEffect(() => {
    if (!purchaseSnapshot.configured) return;
    return subscribeToRevenueCat(applyPurchaseSnapshot);
  }, [applyPurchaseSnapshot, purchaseSnapshot.configured]);

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
    if (!activeUid || !functions) {
      throw new Error('Firebase 연결을 확인한 뒤 다시 시도해 주세요.');
    }
    const apply = httpsCallable<{ code: string }, { applied: boolean }>(functions, 'applyReferralCode');
    try {
      await apply({ code });
      await refresh();
    } catch (error) {
      throw new Error(messageForError(error));
    }
  }, [activeUid, refresh]);

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
    if (!activeUid) {
      setReferralCodeVisible(false);
      openLogin('referral-code');
      return;
    }
    void applyOnboardingReferral(normalizedCode);
  }, [activeUid, applyOnboardingReferral, openLogin]);

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
      || !activeUid
      || state.status !== 'ready'
    ) return;
    if (!state.access.canApplyReferralCode) {
      queueMicrotask(() => void finishReferralCode());
      return;
    }
    queueMicrotask(() => void applyOnboardingReferral(pendingReferralCode));
  }, [
    applyOnboardingReferral,
    activeUid,
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

  const purchasePackage = useCallback(async (identifier: string) => {
    if (!purchaseSnapshot.configured || isPurchaseWorking) return false;
    setPurchaseWorking(true);
    setPurchaseError(null);
    trackEvent('purchase_started', { package_id: identifier, source: paywallSource ?? 'unspecified' });
    try {
      const next = await purchaseRevenueCatPackage(identifier);
      applyPurchaseSnapshot(next);
      trackEvent('purchase_completed', { package_id: identifier, source: paywallSource ?? 'unspecified' });
      if (next.isPro) setPaywallVisible(false);
      return next.isPro;
    } catch (error) {
      const cancelled = Boolean(
        error
        && typeof error === 'object'
        && 'userCancelled' in error
        && error.userCancelled,
      );
      if (!cancelled) {
        setPurchaseError(messageForError(error));
        trackEvent('purchase_failed', { package_id: identifier, source: paywallSource ?? 'unspecified' });
      }
      return false;
    } finally {
      setPurchaseWorking(false);
    }
  }, [applyPurchaseSnapshot, isPurchaseWorking, paywallSource, purchaseSnapshot.configured]);

  const restorePurchases = useCallback(async () => {
    if (!purchaseSnapshot.configured || isPurchaseWorking) return false;
    setPurchaseWorking(true);
    setPurchaseError(null);
    try {
      const next = await restoreRevenueCatPurchases();
      applyPurchaseSnapshot(next);
      trackEvent('purchase_restored', { result: next.isPro ? 'pro' : 'no_active_purchase' });
      if (!next.isPro) setPurchaseError('복원할 수 있는 활성 Pro 구독이 없어요.');
      if (next.isPro) setPaywallVisible(false);
      return next.isPro;
    } catch (error) {
      setPurchaseError(messageForError(error));
      trackEvent('purchase_restore_failed');
      return false;
    } finally {
      setPurchaseWorking(false);
    }
  }, [applyPurchaseSnapshot, isPurchaseWorking, purchaseSnapshot.configured]);

  const tier = accountTier({
    isPro: state.status === 'ready' && state.access.isPro,
  });
  const productAccess = productAccessFor(tier, {
    linkedAccount: hasLinkedAccount(authState),
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
    purchaseError,
    purchasePackage,
    purchasePackages: purchaseSnapshot.packages,
    purchasesConfigured: purchaseSnapshot.configured,
    isPurchaseWorking,
    proPlanEnabled: PRO_PLAN_ENABLED,
    productAccess,
    refresh,
    restorePurchases,
    rewardedAdsAvailable: PRO_PLAN_ENABLED && rewardedAdTestFallbackAvailable,
    showRewardedAd,
    state,
    subscriptionManagementUrl: purchaseSnapshot.managementUrl,
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
    purchaseError,
    purchasePackage,
    purchaseSnapshot,
    isPurchaseWorking,
    productAccess,
    refresh,
    restorePurchases,
    showRewardedAd,
    state,
  ]);

  return (
    <MonetizationContext.Provider value={value}>
      {children}
      <LoginModal />
      {PRO_PLAN_ENABLED ? (
        <ProPaywallModal
          error={purchaseError}
          isConfigured={purchaseSnapshot.configured}
          isWorking={isPurchaseWorking}
          onClose={closePaywall}
          onPurchase={purchasePackage}
          onRestore={restorePurchases}
          packages={purchaseSnapshot.packages}
          source={paywallSource}
          visible={isPaywallVisible}
        />
      ) : null}
      <ReferralCodeOnboardingModal
        error={referralPromptError}
        isApplying={isApplyingReferral}
        onApply={submitOnboardingReferral}
        onClose={closeReferralCode}
        requiresLogin={!activeUid}
        visible={isReferralCodeVisible}
      />
    </MonetizationContext.Provider>
  );
}

export function useMonetization() {
  return useContext(MonetizationContext);
}
