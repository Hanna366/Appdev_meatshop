import type { User } from '../types/authTypes';

/**
 * Load user profile document from Firestore `users` collection.
 * Expected shape in Firestore: { tenantId: string, role: string, name?: string }
 */
export async function loadUserProfile(uid: string): Promise<Partial<User> | null> {
  try {
    const { getFirestore, doc, getDoc, setDoc } = await import('firebase/firestore');
    const db = getFirestore();
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // Auto-provision a minimal profile for new users so the app has tenant/role.
      const defaultProfile: Partial<User> = { tenantId: 'tn_001', role: 'manager' as User['role'], name: '' };
      try {
        await setDoc(ref, defaultProfile);
      } catch (e) {
        // ignore write failures (security rules may prevent auto-creation)
      }
      return defaultProfile;
    }
    const data = snap.data() as any;
    return {
      tenantId: data.tenantId ?? '',
      role: (data.role as any) ?? 'cashier',
      name: data.name ?? '',
    };
  } catch (err) {
    console.warn('Failed to load user profile from Firestore:', err);
    return null;
  }
}
