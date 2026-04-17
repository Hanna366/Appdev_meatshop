import firebaseConfig from '../../config/firebaseConfig';

/**
 * Initialize Firebase if the `firebase` package is installed.
 * This uses a dynamic import so the app won't crash if the SDK isn't added yet.
 * Returns the initialized app or `null` if initialization did not occur.
 */
export async function initFirebase(): Promise<any | null> {
  try {
    const firebaseAppModule = await import('firebase/app');
    const { initializeApp, getApps } = firebaseAppModule as any;

    if (!initializeApp || !getApps) {
      console.warn('Firebase SDK API not found - ensure `firebase` package is installed.');
      return null;
    }

    if (getApps().length === 0) {
      const app = initializeApp(firebaseConfig);
      return app;
    }

    return getApps()[0];
  } catch (err) {
    // Likely `firebase` package not installed — log and continue.
    console.warn('Firebase initialization skipped (firebase package missing or failed):', err);
    return null;
  }
}
