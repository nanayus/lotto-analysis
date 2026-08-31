import {
  GoogleAuthProvider,
  linkWithPopup,
  OAuthProvider,
  OAuthCredential,
  reauthenticateWithPopup,
  signInWithPopup,
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

export async function signInOnWeb(auth: Auth, provider: AuthProviderId) {
  const authProvider = buildProvider(provider);
  await signInWithPopup(auth, authProvider);
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
