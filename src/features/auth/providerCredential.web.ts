import {
  GoogleAuthProvider,
  linkWithPopup,
  OAuthProvider,
  OAuthCredential,
  reauthenticateWithPopup,
  signInWithCredential,
  signInWithPopup,
  type Auth,
  type AuthError,
  type User,
} from 'firebase/auth';

import type { AuthProviderId } from './types';

export class AuthenticationCancelledError extends Error {}

function buildProvider(provider: AuthProviderId) {
  if (provider === 'google.com') return new GoogleAuthProvider();
  const apple = new OAuthProvider('apple.com');
  apple.addScope('email');
  apple.addScope('name');
  apple.setCustomParameters({ locale: 'ko_KR' });
  return apple;
}

export async function signInOnWeb(auth: Auth, provider: AuthProviderId) {
  const authProvider = buildProvider(provider);
  if (!auth.currentUser?.isAnonymous) {
    await signInWithPopup(auth, authProvider);
    return;
  }
  try {
    await linkWithPopup(auth.currentUser, authProvider);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
    if (!code.includes('credential-already-in-use')) throw error;
    const credential = provider === 'google.com'
      ? GoogleAuthProvider.credentialFromError(error as AuthError)
      : OAuthProvider.credentialFromError(error as AuthError);
    if (!credential) throw error;
    await signInWithCredential(auth, credential);
  }
}

export async function linkOnWeb(user: User, provider: AuthProviderId) {
  const authProvider = buildProvider(provider);
  await linkWithPopup(user, authProvider);
}

export const authenticate = signInOnWeb;
export const linkProvider = linkOnWeb;

export async function reauthenticateProvider(user: User, provider: AuthProviderId) {
  const authProvider = buildProvider(provider);
  const result = await reauthenticateWithPopup(user, authProvider);
  const credential = OAuthProvider.credentialFromResult(result) as OAuthCredential | null;
  return provider === 'apple.com' ? { appleAccessToken: credential?.accessToken } : {};
}

export async function disconnectGoogleProvider() {}
