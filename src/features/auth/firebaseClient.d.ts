import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';

export const auth: Auth | null;
export const db: Firestore | null;
export const functions: Functions | null;

