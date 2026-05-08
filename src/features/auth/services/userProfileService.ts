import type { User } from '../types/authTypes';

/**
 * Load user profile document from Firestore `users` collection.
 * Expected shape in Firestore: { tenantId: string, role: string, name?: string }
 */
export async function loadUserProfile(uid: string): Promise<Partial<User> | null> {
  try {
    const { getDb } = await import('../../../lib/firebase');
    const { getAuthInstance } = await import('../../../lib/firebase');
    const db = await getDb();
    if (!db) return null;
    const auth = await getAuthInstance();
    const firestore: any = await import('firebase/firestore');
    const ref = firestore.doc(db, 'users', uid);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) {
      const firebaseUser = auth?.currentUser ?? null;
      const email = firebaseUser?.email ?? '';

      if (email) {
        try {
          const usersRef = firestore.collection(db, 'users');
          const emailQuery = firestore.query(usersRef, firestore.where('email', '==', email));
          const emailSnap = await firestore.getDocs(emailQuery);
          const profileDoc = emailSnap.docs?.[0];

          if (profileDoc) {
            const data = profileDoc.data() as any;
            return {
              tenantId: data.tenantId ?? '',
              role: (data.role as any) ?? 'cashier',
              name: data.name ?? '',
            };
          }
        } catch (e) {
          console.warn('Failed to load user profile by email from Firestore:', e);
        }
      }

      const fallbackName =
        firebaseUser?.displayName?.trim() ||
        firebaseUser?.email?.split('@')[0]?.trim() ||
        'Meatshop User';
      const defaultProfile = {
        email,
        name: fallbackName,
        tenantId: 'tn_001',
        role: 'manager' as User['role'],
        createdAt: firestore.serverTimestamp(),
        updatedAt: firestore.serverTimestamp(),
      };

      if (!defaultProfile.email) {
        return null;
      }

      try {
        await firestore.setDoc(ref, defaultProfile);
        return {
          tenantId: defaultProfile.tenantId,
          role: defaultProfile.role,
          name: defaultProfile.name,
        };
      } catch (e) {
        console.warn('Failed to auto-provision user profile in Firestore:', e);
        return null;
      }
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
