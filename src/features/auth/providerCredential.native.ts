import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuthAndroid } from '@invertase/react-native-apple-authentication';
import {
  GoogleAuthProvider,
  linkWithCredential,
  OAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
  type Auth,
  type User,
  updateProfile,
} from 'firebase/auth';

import type { AuthProviderId, ProviderCredentialResult } from './types';

export class AuthenticationCancelledError extends Error {}

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: googleWebClientId,
});

async function googleCredential(): Promise<ProviderCredentialResult> {
  if (!googleWebClientId) throw new Error('Google OAuth Client ID가 설정되지 않았어요.');
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') throw new AuthenticationCancelledError();
  if (!response.data.idToken) throw new Error('Google 인증 토큰을 받지 못했어요.');
  return { credential: GoogleAuthProvider.credential(response.data.idToken) };
}

async function appleCredential(): Promise<ProviderCredentialResult> {
  if (Platform.OS === 'ios') {
    if (!await AppleAuthentication.isAvailableAsync()) {
      throw new Error('이 기기에서는 Apple 로그인을 사용할 수 없어요.');
    }
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );
    const response = await AppleAuthentication.signInAsync({
      nonce: hashedNonce,
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!response.identityToken) throw new Error('Apple 인증 토큰을 받지 못했어요.');
    const displayName = [response.fullName?.givenName, response.fullName?.familyName]
      .filter(Boolean)
      .join(' ');
    return {
      appleAuthorizationCode: response.authorizationCode ?? undefined,
      appleClientKind: 'native',
      credential: new OAuthProvider('apple.com').credential({
        idToken: response.identityToken,
        rawNonce,
      }),
      ...(displayName ? { displayName } : {}),
    };
  }

  const clientId = process.env.EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID;
  const redirectUri = process.env.EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI;
  if (!clientId || !redirectUri) throw new Error('Android Apple 로그인이 설정되지 않았어요.');
  const nonce = Crypto.randomUUID();
  appleAuthAndroid.configure({
    clientId,
    nonce,
    redirectUri,
    responseType: appleAuthAndroid.ResponseType.ALL,
    scope: appleAuthAndroid.Scope.ALL,
    state: Crypto.randomUUID(),
  });
  const response = await appleAuthAndroid.signIn();
  if (!response.id_token) throw new Error('Apple 인증 토큰을 받지 못했어요.');
  const displayName = [response.user?.name?.firstName, response.user?.name?.lastName]
    .filter(Boolean)
    .join(' ');
  return {
    appleAuthorizationCode: response.code,
    appleClientKind: 'service',
    credential: new OAuthProvider('apple.com').credential({
      idToken: response.id_token,
      rawNonce: response.nonce ?? nonce,
    }),
    ...(displayName ? { displayName } : {}),
  };
}

export async function getProviderCredential(provider: AuthProviderId) {
  try {
    return provider === 'google.com' ? await googleCredential() : await appleCredential();
  } catch (error) {
    if (
      error instanceof AuthenticationCancelledError
      || (error && typeof error === 'object' && (
        'code' in error && (
          error.code === 'ERR_REQUEST_CANCELED'
          || error.code === appleAuthAndroid.Error.SIGNIN_CANCELLED
        )
      ))
    ) throw new AuthenticationCancelledError();
    throw error;
  }
}

export async function authenticate(auth: Auth, provider: AuthProviderId) {
  const result = await getProviderCredential(provider);
  let signedIn;
  if (auth.currentUser?.isAnonymous) {
    try {
      signedIn = await linkWithCredential(auth.currentUser, result.credential);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : '';
      if (!code.includes('credential-already-in-use')) throw error;
      signedIn = await signInWithCredential(auth, result.credential);
    }
  } else {
    signedIn = await signInWithCredential(auth, result.credential);
  }
  if (result.displayName && !signedIn.user.displayName) {
    await updateProfile(signedIn.user, { displayName: result.displayName });
  }
}

export async function linkProvider(user: User, provider: AuthProviderId) {
  const result = await getProviderCredential(provider);
  await linkWithCredential(user, result.credential);
}

export async function reauthenticateProvider(user: User, provider: AuthProviderId) {
  const result = await getProviderCredential(provider);
  await reauthenticateWithCredential(user, result.credential);
  return {
    appleAuthorizationCode: result.appleAuthorizationCode,
    appleClientKind: result.appleClientKind,
  };
}

export async function disconnectGoogleProvider() {
  await GoogleSignin.revokeAccess().catch(() => undefined);
}
