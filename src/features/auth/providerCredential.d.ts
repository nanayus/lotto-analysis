import type { Auth, User } from 'firebase/auth';

import type { AuthProviderId } from './types';

export class AuthenticationCancelledError extends Error {}
export function authenticate(auth: Auth, provider: AuthProviderId): Promise<void>;
export function linkProvider(user: User, provider: AuthProviderId): Promise<void>;
export function reauthenticateProvider(user: User, provider: AuthProviderId): Promise<{
  appleAccessToken?: string;
  appleAuthorizationCode?: string;
  appleClientKind?: 'native' | 'service';
}>;
export function disconnectGoogleProvider(): Promise<void>;
