import 'react-native-gesture-handler/jestSetup';
import './tamagui.config';
import { jest } from '@jest/globals';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  Stack: Object.assign(jest.fn(({ children }) => children ?? null), {
    Screen: jest.fn(() => null),
  }),
  Tabs: Object.assign(jest.fn(({ children }) => children ?? null), {
    Screen: jest.fn(() => null),
  }),
  router: {
    back: jest.fn(),
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(() => ({
    back: jest.fn(),
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('firebase/app', () => ({
  getApp: jest.fn(),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: jest.fn() },
  OAuthProvider: Object.assign(jest.fn(), { credentialFromResult: jest.fn() }),
  browserLocalPersistence: {},
  getAuth: jest.fn(),
  getReactNativePersistence: jest.fn(() => ({})),
  getRedirectResult: jest.fn(() => Promise.resolve(null)),
  initializeAuth: jest.fn(),
  linkWithCredential: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  reauthenticateWithCredential: jest.fn(),
  revokeAccessToken: jest.fn(),
  setPersistence: jest.fn(() => Promise.resolve()),
  signInAnonymously: jest.fn(() => Promise.resolve()),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
  updateProfile: jest.fn(() => Promise.resolve()),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  getFirestore: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
  setDoc: jest.fn(() => Promise.resolve()),
  writeBatch: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(),
  logScreenView: jest.fn(() => Promise.resolve()),
  setAnalyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    addCustomerInfoUpdateListener: jest.fn(),
    configure: jest.fn(),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    logIn: jest.fn(),
    purchasePackage: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
    restorePurchases: jest.fn(),
  },
  PACKAGE_TYPE: {
    ANNUAL: 'ANNUAL',
    MONTHLY: 'MONTHLY',
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    revokeAccess: jest.fn(),
    signIn: jest.fn(),
  },
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuthAndroid: {
    Error: { SIGNIN_CANCELLED: 'cancelled' },
    ResponseType: { ALL: 'ALL' },
    Scope: { ALL: 'ALL' },
    configure: jest.fn(),
    signIn: jest.fn(),
  },
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Error: 'error', Success: 'success', Warning: 'warning' },
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@tamagui/card', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Card = ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement(View, { testID }, children);
  return { Card };
});

jest.mock('@tamagui/button', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Button = ({
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    children,
    disabled,
    onPress,
    testID,
  }: {
    accessibilityLabel?: string;
    accessibilityRole?: 'button';
    accessibilityState?: { disabled?: boolean };
    children?: React.ReactNode;
    disabled?: boolean;
    onPress?: () => void;
    testID?: string;
  }) => React.createElement(Pressable, {
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    disabled,
    onPress,
    testID,
  }, children);
  Button.Text = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(Text, null, children);
  return { Button };
});

jest.mock('react-native-reanimated', () => {
  return jest.requireActual('react-native-reanimated/mock');
});
