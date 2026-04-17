import type { User } from '../types/authTypes';

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
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  const auth = getAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return mapFirebaseUser(cred.user);
}

export async function signOut(): Promise<void> {
  const { getAuth, signOut: fbSignOut } = await import('firebase/auth');
  await fbSignOut(getAuth());
}

export async function signUp(email: string, password: string): Promise<User> {
  const { getAuth, createUserWithEmailAndPassword, sendEmailVerification } = await import(
    'firebase/auth',
  );
  const auth = getAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(cred.user);
  } catch (e) {
    // ignore email send errors here
  }
  return mapFirebaseUser(cred.user);
}

export async function sendResetEmail(email: string): Promise<void> {
  const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
  await sendPasswordResetEmail(getAuth(), email);
}

export function watchAuthState(cb: (user: User | null) => void) {
  let unsub: (() => void) | null = null;
  import('firebase/auth')
    .then(({ getAuth, onAuthStateChanged }) => {
      unsub = onAuthStateChanged(getAuth(), (fbUser) => {
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
