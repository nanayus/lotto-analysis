import {
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  OAuthProvider,
  OAuthCredential,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
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

function shouldRedirect() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export async function signInOnWeb(auth: Auth, provider: AuthProviderId) {
  const authProvider = buildProvider(provider);
  if (shouldRedirect()) {
    await signInWithRedirect(auth, authProvider);
    return;
  }
  await signInWithPopup(auth, authProvider);
}

export async function linkOnWeb(user: User, provider: AuthProviderId) {
  const authProvider = buildProvider(provider);
  if (shouldRedirect()) {
    await linkWithRedirect(user, authProvider);
    return;
  }
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
