import type { LoginPayload, User } from '../types/authTypes';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const DEMO_CREDENTIALS = {
  email: '2301111318@student.buksu.edu.ph',
  password: 'password123',
};

async function getUserProfile(uid: string): Promise<User> {
  const db = getFirestore();
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

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

export const authService = {
  async login(values: { email: string; password: string }): Promise<User> {
    try {
      const cred = await signInWithEmailAndPassword(getAuth(), values.email, values.password);
      // Try to load Firestore profile, fall back to a merged Firebase user if profile missing.
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

        // If profile couldn't be loaded, attempt to read Firestore document directly
        try {
          return await getUserProfile(cred.user.uid);
        } catch (e) {
          return userFromAuth;
        }
      } catch (e) {
        // if userProfileService import or its logic fails, fallback to direct profile read
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
    } catch (err) {
      // fallback to demo
      if (
        values.email.toLowerCase() !== DEMO_CREDENTIALS.email ||
        values.password !== DEMO_CREDENTIALS.password
      ) {
        throw new Error('Invalid credentials.');
      }

      return {
        id: 'usr_001',
        email: DEMO_CREDENTIALS.email,
        name: 'Demo Manager',
        tenantId: 'tn_001',
        role: 'manager',
      };
    }
  },

  async logout() {
    await signOut(getAuth());
  },
};
