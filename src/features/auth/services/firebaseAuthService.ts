import type { User } from '../types/authTypes';
import { getAuthInstance } from '../../../lib/firebase';

/**
 * Lightweight Firebase Auth wrapper using modular SDK.
 * Exports signIn, signOut, signUp, sendResetEmail and watchAuthState.
 */
function mapFirebaseUser(fbUser: any): User {
  return {
    id: fbUser.uid,
    name: fbUser.displayName ?? '',
    email: fbUser.email ?? '',
    tenantId: '',
    role: 'cashier',
  };
}

export async function signIn(email: string, password: string): Promise<User> {
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const auth = await getAuthInstance();
  if (!auth) throw new Error('Auth not initialized');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return mapFirebaseUser(cred.user);
}

export async function signOut(): Promise<void> {
  const { signOut: fbSignOut } = await import('firebase/auth');
  const auth = await getAuthInstance();
  if (!auth) return;
  await fbSignOut(auth);
}

export async function signUp(email: string, password: string): Promise<User> {
  const { createUserWithEmailAndPassword, sendEmailVerification } = await import(
    'firebase/auth',
  );
  const auth = await getAuthInstance();
  if (!auth) throw new Error('Auth not initialized');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(cred.user);
  } catch (e) {
    // ignore email send errors here
  }
  return mapFirebaseUser(cred.user);
}

export async function sendResetEmail(email: string): Promise<void> {
  const { sendPasswordResetEmail } = await import('firebase/auth');
  const auth = await getAuthInstance();
  if (!auth) throw new Error('Auth not initialized');
  await sendPasswordResetEmail(auth, email);
}

export function watchAuthState(cb: (user: User | null) => void) {
  let unsub: (() => void) | null = null;
  import('firebase/auth')
    .then(async ({ onAuthStateChanged }) => {
      const auth = await getAuthInstance();
      if (!auth) {
        cb(null);
        return;
      }

      unsub = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) cb(mapFirebaseUser(fbUser));
        else cb(null);
      });
    })
    .catch(() => {
      // no-op if firebase not initialized
      cb(null);
    });

  return () => {
    if (unsub) unsub();
  };
}
