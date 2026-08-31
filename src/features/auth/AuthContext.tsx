import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  revokeAccessToken,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { auth, db, functions } from './firebaseClient';
import { firebaseConfigurationError } from './firebaseConfig';
import {
  authenticate,
  AuthenticationCancelledError,
  disconnectGoogleProvider,
  linkProvider,
  reauthenticateProvider,
} from './providerCredential';
import type { AppUser, AuthProviderId, AuthState } from './types';
import { LoginModal } from './LoginModal';

const PENDING_INTENT_KEY = 'lotto.auth.pendingIntent';

type AuthValue = {
  clearError: () => void;
  closeLogin: () => void;
  consumePendingIntent: (intent: string) => boolean;
  deleteAccount: () => Promise<void>;
  error: string | null;
  isConfigured: boolean;
  isLoginVisible: boolean;
  isWorking: boolean;
  link: (provider: AuthProviderId) => Promise<void>;
  openLogin: (intent?: string, onSuccess?: () => void) => void;
  signIn: (provider: AuthProviderId) => Promise<void>;
  signOut: () => Promise<void>;
  state: AuthState;
};

const fallbackValue: AuthValue = {
  clearError: () => undefined,
  closeLogin: () => undefined,
  consumePendingIntent: () => false,
  deleteAccount: async () => undefined,
  error: null,
  isConfigured: false,
  isLoginVisible: false,
  isWorking: false,
  link: async () => undefined,
  openLogin: (_intent, onSuccess) => onSuccess?.(),
  signIn: async () => undefined,
  signOut: async () => undefined,
  state: { status: 'guest' },
};

const AuthContext = createContext<AuthValue>(fallbackValue);

function toAppUser(user: User): AppUser {
  const providers = [...new Set(user.providerData
    .map((item) => item.providerId)
    .filter((provider): provider is AuthProviderId => (
      provider === 'apple.com' || provider === 'google.com'
    )))];
  return {
    displayName: user.displayName,
    email: user.email,
    photoUrl: user.photoURL,
    providers,
    uid: user.uid,
  };
}

function messageForError(error: unknown) {
  if (error instanceof AuthenticationCancelledError) return null;
  if (!error || typeof error !== 'object') return '로그인 중 문제가 발생했어요.';
  const code = 'code' in error ? String(error.code) : '';
  if (code.includes('credential-already-in-use')) return '이 로그인 수단은 다른 계정에 연결되어 있어요.';
  if (code.includes('popup-closed') || code.includes('cancelled-popup-request')) return null;
  if (code.includes('network-request-failed')) return '네트워크 연결을 확인해 주세요.';
  if (code.includes('requires-recent-login')) return '계정 보호를 위해 다시 로그인해 주세요.';
  if ('message' in error && typeof error.message === 'string') return error.message;
  return '로그인 중 문제가 발생했어요.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(auth ? { status: 'loading' } : { status: 'guest' });
  const [isLoginVisible, setLoginVisible] = useState(false);
  const [isWorking, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(firebaseConfigurationError);
  const successCallback = useRef<(() => void) | null>(null);
  const pendingIntent = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setState({ status: 'guest' });
        return;
      }
      const appUser = toAppUser(firebaseUser);
      setState({ status: 'authenticated', user: appUser });
      setLoginVisible(false);
      if (db) {
        const profileReference = doc(db, 'users', firebaseUser.uid);
        void getDoc(profileReference).then((profile) => setDoc(profileReference, {
          ...(!profile.exists() ? { createdAt: serverTimestamp() } : {}),
          lastLoginAt: serverTimestamp(),
          providers: appUser.providers,
          uid: firebaseUser.uid,
        }, { merge: true })).catch(() => undefined);
      }
      const callback = successCallback.current;
      successCallback.current = null;
      if (callback) {
        pendingIntent.current = undefined;
        if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(PENDING_INTENT_KEY);
        }
      }
      callback?.();
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const closeLogin = useCallback(() => {
    if (isWorking) return;
    successCallback.current = null;
    pendingIntent.current = undefined;
    setLoginVisible(false);
    setError(firebaseConfigurationError);
  }, [isWorking]);

  const openLogin = useCallback((intent?: string, onSuccess?: () => void) => {
    if (state.status === 'authenticated') {
      onSuccess?.();
      return;
    }
    pendingIntent.current = intent;
    successCallback.current = onSuccess ?? null;
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined' && intent) {
      sessionStorage.setItem(PENDING_INTENT_KEY, intent);
    }
    setError(firebaseConfigurationError);
    setLoginVisible(true);
  }, [state.status]);

  const signIn = useCallback(async (provider: AuthProviderId) => {
    if (!auth) {
      setError(firebaseConfigurationError);
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await authenticate(auth, provider);
    } catch (signInError) {
      setError(messageForError(signInError));
    } finally {
      setWorking(false);
    }
  }, []);

  const link = useCallback(async (provider: AuthProviderId) => {
    if (!auth?.currentUser) return;
    setWorking(true);
    setError(null);
    try {
      await linkProvider(auth.currentUser, provider);
      await auth.currentUser.reload();
      setState({ status: 'authenticated', user: toAppUser(auth.currentUser) });
    } catch (linkError) {
      setError(messageForError(linkError));
      throw linkError;
    } finally {
      setWorking(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!auth?.currentUser || !functions) throw new Error('로그인 정보를 확인할 수 없어요.');
    setWorking(true);
    setError(null);
    try {
      const provider = auth.currentUser.providerData.some((item) => item.providerId === 'apple.com')
        ? 'apple.com'
        : 'google.com';
      const reauthentication = await reauthenticateProvider(auth.currentUser, provider);
      if (reauthentication.appleAccessToken) {
        await revokeAccessToken(auth, reauthentication.appleAccessToken);
      }
      const callDeleteAccount = httpsCallable<
        { appleAuthorizationCode?: string; appleClientKind?: 'native' | 'service' },
        { deleted: boolean }
      >(functions, 'deleteAccount');
      const uid = auth.currentUser.uid;
      await callDeleteAccount({
        appleAuthorizationCode: reauthentication.appleAuthorizationCode,
        appleClientKind: reauthentication.appleClientKind,
      });
      await AsyncStorage.removeItem(`lotto.numberLibrary.user.${uid}.v1`).catch(() => undefined);
      if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(PENDING_INTENT_KEY);
        sessionStorage.removeItem('lotto.combinationDraft.v1');
      }
      if (provider === 'google.com') await disconnectGoogleProvider();
      await firebaseSignOut(auth).catch(() => undefined);
    } catch (deleteError) {
      setError(messageForError(deleteError));
      throw deleteError;
    } finally {
      setWorking(false);
    }
  }, []);

  const consumePendingIntent = useCallback((intent: string) => {
    if (pendingIntent.current === intent) {
      pendingIntent.current = undefined;
      if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(PENDING_INTENT_KEY);
      }
      return true;
    }
    if (Platform.OS !== 'web' || typeof sessionStorage === 'undefined') return false;
    if (sessionStorage.getItem(PENDING_INTENT_KEY) !== intent) return false;
    sessionStorage.removeItem(PENDING_INTENT_KEY);
    return true;
  }, []);

  const value = useMemo<AuthValue>(() => ({
    clearError,
    closeLogin,
    consumePendingIntent,
    deleteAccount,
    error,
    isConfigured: Boolean(auth),
    isLoginVisible,
    isWorking,
    link,
    openLogin,
    signIn,
    signOut,
    state,
  }), [clearError, closeLogin, consumePendingIntent, deleteAccount, error, isLoginVisible, isWorking, link, openLogin, signIn, signOut, state]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
