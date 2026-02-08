import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getMessaging, isSupported as isMessagingSupported, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth: Auth = getAuth(app);

// Analytics (client-side only)
let analytics: Analytics | null = null;

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (analytics) return analytics;

  const supported = await isSupported();
  if (supported && firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
  }
  return analytics;
}

// Messaging (client-side only)
let messaging: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messaging) return messaging;

  const supported = await isMessagingSupported();
  if (supported) {
    messaging = getMessaging(app);
  }
  return messaging;
}
