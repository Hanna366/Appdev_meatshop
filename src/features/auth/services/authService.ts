import type { User } from '../types/authTypes';
import { getAuthInstance, getDb } from '../../../lib/firebase';
import { hasUsableFirebaseConfig } from '../../../config/firebaseConfig';

const DEMO_PASSWORD = 'password123';
const DEMO_EMAIL = 'demo@meatshop.app';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isDemoCredential(values: { email: string; password: string }): boolean {
  return normalizeEmail(values.email) === DEMO_EMAIL && values.password === DEMO_PASSWORD;
}

function createDemoUser(email: string): User {
  return {
    id: 'usr_001',
    email: normalizeEmail(email),
    name: 'Demo Manager',
    tenantId: 'tn_001',
    role: 'manager',
  };
}

function getFriendlyAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as any).code ?? '') : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password.';
    case 'auth/user-not-found':
      return 'No account was found for that email address.';
    case 'auth/network-request-failed':
      return 'The app could not reach Firebase. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled in Firebase for this project.';
    case 'auth/app-not-authorized':
      return 'This app is not authorized for the current Firebase project.';
    case 'auth/invalid-api-key':
      return 'The Firebase API key in this build is invalid.';
    default:
      return error instanceof Error ? error.message : 'Login failed.';
  }
}

async function getUserProfile(uid: string): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore: any = await import('firebase/firestore');
  const ref = firestore.doc(db, 'users', uid);
  const snap = await firestore.getDoc(ref);

  if (!snap.exists()) {
    // If no profile exists, throw to allow caller to attempt auto-provisioning elsewhere.
    throw new Error('User profile not found in Firestore.');
  }

  const data = snap.data() as any;

  return {
    id: uid,
    email: data.email ?? '',
    name: data.name ?? '',
    tenantId: data.tenantId ?? '',
    role: (data.role as any) ?? 'manager',
  };
}

async function mapAuthenticatedUser(cred: any): Promise<User> {
  try {
    const { loadUserProfile } = await import('./userProfileService');
    const profile = await loadUserProfile(cred.user.uid);
    const userFromAuth = {
      id: cred.user.uid,
      email: cred.user.email ?? '',
      name: cred.user.displayName ?? '',
      tenantId: '',
      role: 'cashier' as any,
    } as User;

    if (profile) {
      return {
        ...userFromAuth,
        tenantId: (profile.tenantId as string) ?? userFromAuth.tenantId,
        role: (profile.role as any) ?? userFromAuth.role,
        name: profile.name ?? userFromAuth.name,
      };
    }

    try {
      return await getUserProfile(cred.user.uid);
    } catch (e) {
      return userFromAuth;
    }
  } catch (e) {
    try {
      return await getUserProfile(cred.user.uid);
    } catch (err) {
      return {
        id: cred.user.uid,
        email: cred.user.email ?? '',
        name: cred.user.displayName ?? '',
        tenantId: '',
        role: 'cashier',
      } as User;
    }
  }
}

export const authService = {
  async login(values: { email: string; password: string }): Promise<User> {
    if (!hasUsableFirebaseConfig() && isDemoCredential(values)) {
      return createDemoUser(values.email);
    }

    try {
      const auth = await getAuthInstance();
      if (!auth) throw new Error('Auth not initialized');
      const authMod: any = await import('firebase/auth');
      const { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } = authMod as any;
      let cred: any;

      try {
        cred = await signInWithEmailAndPassword(auth, values.email, values.password);
      } catch (signInError: any) {
        const code = String(signInError?.code ?? '');
        const shouldAttemptRegistration =
          hasUsableFirebaseConfig() &&
          (code === 'auth/invalid-credential' ||
            code === 'auth/user-not-found' ||
            code === 'auth/invalid-login-credentials');

        if (!shouldAttemptRegistration) {
          throw signInError;
        }

        try {
          cred = await createUserWithEmailAndPassword(auth, values.email, values.password);
          const displayName =
            values.email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Meatshop User';
          await updateProfile(cred.user, { displayName }).catch(() => null);
        } catch (createError: any) {
          const createCode = String(createError?.code ?? '');
          if (createCode === 'auth/email-already-in-use') {
            throw signInError;
          }

          throw createError;
        }
      }

      return await mapAuthenticatedUser(cred);
    } catch (err) {
      if (hasUsableFirebaseConfig()) {
        throw new Error(getFriendlyAuthErrorMessage(err));
      }

      // fallback to demo
      if (!isDemoCredential(values)) {
        throw new Error('Invalid credentials.');
      }

      return createDemoUser(values.email);
    }
  },

  async logout() {
    const auth = await getAuthInstance();
    if (!auth) return;
    const authMod: any = await import('firebase/auth');
    const { signOut } = authMod as any;
    await signOut(auth);
  },
};
