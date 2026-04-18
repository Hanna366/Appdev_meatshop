// Firebase configuration. Prefer setting public values via environment variables
// for local/dev usage (Expo: EXPO_PUBLIC_*). If not provided, fill the
// placeholders below with values from your Firebase project (Web app)
// found in the Firebase Console -> Project settings -> Your apps -> SDK config.

export type FirebaseConfig = {
  apiKey: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
};

// Prefer Expo public env vars (EXPO_PUBLIC_FIREBASE_*) when available.
const env = (global as any).__DEV__ ? process.env : (process.env as any);

const firebaseConfig: FirebaseConfig = {
  apiKey: env?.EXPO_PUBLIC_FIREBASE_API_KEY ?? env?.REACT_APP_FIREBASE_API_KEY ?? 'YOUR_API_KEY',
  authDomain: env?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? env?.REACT_APP_FIREBASE_AUTH_DOMAIN ?? 'YOUR_AUTH_DOMAIN',
  projectId: env?.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? env?.REACT_APP_FIREBASE_PROJECT_ID ?? 'appdev-3d42e',
  storageBucket: env?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? env?.REACT_APP_FIREBASE_STORAGE_BUCKET ?? 'YOUR_STORAGE_BUCKET',
  messagingSenderId: env?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? env?.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ?? 'YOUR_MESSAGING_SENDER_ID',
  appId: env?.EXPO_PUBLIC_FIREBASE_APP_ID ?? env?.REACT_APP_FIREBASE_APP_ID ?? 'YOUR_APP_ID',
  measurementId: env?.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? env?.REACT_APP_FIREBASE_MEASUREMENT_ID ?? 'YOUR_MEASUREMENT_ID',
};

// If a local dev file exists at project root `dev.firebase.json`, prefer it for
// development only. This file should NOT be committed to source control.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const devCfg = require('../../dev.firebase.json');
  if (devCfg && devCfg.apiKey && !String(firebaseConfig.apiKey).startsWith('EXPO')) {
    Object.assign(firebaseConfig, devCfg);
  }
} catch (e) {
  // ignore if not present
}

export default firebaseConfig;
