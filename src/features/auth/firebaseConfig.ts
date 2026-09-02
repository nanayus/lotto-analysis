export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-0C2D8KS9Q8',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey
  && firebaseConfig.appId
  && firebaseConfig.authDomain
  && firebaseConfig.messagingSenderId
  && firebaseConfig.projectId
  && firebaseConfig.storageBucket,
);

export const isAnalyticsConfigured = Boolean(
  isFirebaseConfigured && firebaseConfig.measurementId,
);

export const firebaseConfigurationError = isFirebaseConfigured
  ? null
  : 'Firebase 연결 정보가 설정되지 않았어요.';
