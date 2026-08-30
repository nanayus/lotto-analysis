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
  | { status: 'authenticated'; user: AppUser };

export type ProviderCredentialResult = {
  appleAuthorizationCode?: string;
  appleClientKind?: 'native' | 'service';
  credential: AuthCredential;
  displayName?: string;
};
