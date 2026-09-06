import { act, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Text } from 'react-native';

import { AuthProvider, useAuth } from '../AuthContext';

let mockAuthStateListener: ((user: null | { isAnonymous: boolean; uid: string }) => void) | null = null;
const mockFirebaseSignOut = jest.fn(async () => undefined);
const mockSignInAnonymously = jest.fn(async () => undefined);

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((
    _auth: unknown,
    listener: (user: null | { isAnonymous: boolean; uid: string }) => void,
  ) => {
    mockAuthStateListener = listener;
    return jest.fn();
  }),
  revokeAccessToken: jest.fn(async () => undefined),
  signInAnonymously: mockSignInAnonymously,
  signOut: mockFirebaseSignOut,
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  setDoc: jest.fn(),
}));

jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));

jest.mock('../firebaseClient', () => ({
  auth: { currentUser: null },
  db: null,
  functions: null,
}));

jest.mock('../firebaseConfig', () => ({ firebaseConfigurationError: null }));
jest.mock('../featureFlags', () => ({ ANONYMOUS_AUTH_ENABLED: false }));
jest.mock('../providerCredential', () => ({
  AuthenticationCancelledError: class AuthenticationCancelledError extends Error {},
  authenticate: jest.fn(),
  disconnectGoogleProvider: jest.fn(),
  linkProvider: jest.fn(),
  reauthenticateProvider: jest.fn(),
}));
jest.mock('@/features/analytics/analyticsClient', () => ({ trackEvent: jest.fn() }));

function StateProbe() {
  const { state } = useAuth();
  return <Text testID="auth-state">{state.status}</Text>;
}

describe('AuthProvider with anonymous authentication disabled', () => {
  beforeEach(() => {
    mockAuthStateListener = null;
    mockFirebaseSignOut.mockClear();
    mockSignInAnonymously.mockClear();
  });

  test('stays in guest mode instead of creating an anonymous user', async () => {
    const view = await render(<AuthProvider><StateProbe /></AuthProvider>);

    await act(async () => mockAuthStateListener?.(null));

    await waitFor(() => expect(view.getByTestId('auth-state').props.children).toBe('guest'));
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  test('ignores a persisted anonymous session', async () => {
    const view = await render(<AuthProvider><StateProbe /></AuthProvider>);

    await act(async () => mockAuthStateListener?.({ isAnonymous: true, uid: 'old-anonymous-user' }));

    await waitFor(() => expect(view.getByTestId('auth-state').props.children).toBe('guest'));
    expect(mockFirebaseSignOut).not.toHaveBeenCalled();
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });
});
