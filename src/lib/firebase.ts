import firebaseConfig from '../config/firebaseConfig';

let _app: any = null;
let _auth: any = null;
let _db: any = null;

async function ensureApp(): Promise<any | null> {
  if (_app) return _app;
  try {
    const firebaseAppModule = await import('firebase/app');
    const { initializeApp, getApps } = firebaseAppModule as any;
    if (!initializeApp || !getApps) {
      console.warn('Firebase SDK API not found - ensure `firebase` package is installed.');
      return null;
    }

    if (getApps().length === 0) {
      _app = initializeApp(firebaseConfig);
    } else {
      _app = getApps()[0];
    }

      // If running locally in a browser (dev), attempt to connect SDK to emulators
      try {
        const isLocalhost = typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');
        if (isLocalhost) {
          // connect auth and firestore emulators if available
          try {
            const authMod = await import('firebase/auth');
            const { connectAuthEmulator, getAuth } = authMod as any;
            const auth = getAuth(_app);
            // default emulator host/port used by Emulator Suite
            connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
          } catch (e) {
            // ignore if auth emulator or methods aren't available
          }

          try {
            const firestoreMod = await import('firebase/firestore');
            const { connectFirestoreEmulator, getFirestore } = firestoreMod as any;
            const db = getFirestore(_app);
            connectFirestoreEmulator(db, '127.0.0.1', 8080);
          } catch (e) {
            // ignore if firestore emulator or methods aren't available
          }
        }
      } catch (e) {
        // swallow emulator wiring errors
      }

      return _app;
  } catch (err) {
    console.warn('Firebase initialization skipped (firebase package missing or failed):', err);
    return null;
  }
}

export async function getAuthInstance(): Promise<any | null> {
  if (_auth) return _auth;
  const app = await ensureApp();
  if (!app) return null;
  try {
    const authMod = await import('firebase/auth');
    const { getAuth } = authMod as any;
    _auth = getAuth(app);
    return _auth;
  } catch (err) {
    console.warn('Failed to get firebase auth:', err);
    return null;
  }
}

export async function getDb(): Promise<any | null> {
  if (_db) return _db;
  const app = await ensureApp();
  if (!app) return null;
  try {
    const firestoreMod = await import('firebase/firestore');
    const { getFirestore } = firestoreMod as any;
    _db = getFirestore(app);
    return _db;
  } catch (err) {
    console.warn('Failed to get firestore instance:', err);
    return null;
  }
}

export default { getAuthInstance, getDb };
