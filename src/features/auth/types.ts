import type { AuthCredential } from 'firebase/auth';

export type AuthProviderId = 'apple.com' | 'google.com';

export type AppUser = {
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  providers: AuthProviderId[];
  uid: string;
};

export type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'anonymous'; uid: string }
  | { status: 'authenticated'; user: AppUser };

export function authUid(state: AuthState) {
  if (state.status === 'anonymous') return state.uid;
  if (state.status === 'authenticated') return state.user.uid;
  return null;
}

export function hasLinkedAccount(state: AuthState) {
  return state.status === 'authenticated';
}

export type ProviderCredentialResult = {
  appleAuthorizationCode?: string;
  appleClientKind?: 'native' | 'service';
  credential: AuthCredential;
  displayName?: string;
};
