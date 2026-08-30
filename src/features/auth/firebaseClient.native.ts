import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

if (isFirebaseConfigured) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh can initialize Auth before this module is evaluated again.
    auth = getAuth(app);
  }
  db = getFirestore(app);
  functions = getFunctions(app, process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? 'asia-northeast3');
}

export { auth, db, functions };
