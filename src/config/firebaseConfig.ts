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

const REQUIRED_FIREBASE_FIELDS: Array<keyof FirebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

function isPlaceholderConfigValue(value?: string): boolean {
  if (!value) {
    return true;
  }

  const normalized = String(value).trim();
  if (normalized.length === 0) {
    return true;
  }

  return (
    normalized.startsWith('YOUR_') ||
    normalized.endsWith('_HERE') ||
    normalized.includes('example') ||
    normalized === 'appId' ||
    normalized === 'projectId'
  );
}

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
  if (devCfg && typeof devCfg === 'object') {
    const keys = Object.keys(firebaseConfig) as Array<keyof FirebaseConfig>;

    keys.forEach((key) => {
      const currentValue = firebaseConfig[key];
      const devValue = devCfg[key];

      if (isPlaceholderConfigValue(String(currentValue ?? '')) && !isPlaceholderConfigValue(String(devValue ?? ''))) {
        firebaseConfig[key] = devValue;
      }
    });
  }
} catch (e) {
  // ignore if not present
}

export function hasUsableFirebaseConfig(): boolean {
  return !isPlaceholderConfigValue(firebaseConfig.apiKey) && !isPlaceholderConfigValue(firebaseConfig.appId);
}

export function getFirebaseConfigIssues(): string[] {
  return REQUIRED_FIREBASE_FIELDS.filter((key) => isPlaceholderConfigValue(String(firebaseConfig[key] ?? ''))).map(
    (key) => String(key),
  );
}

export default firebaseConfig;
