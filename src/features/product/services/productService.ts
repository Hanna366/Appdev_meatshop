import { getDb } from '../../../lib/firebase';
import type { Product } from '../types/productTypes';

export async function fetchProductsByTenant(tenantId: string): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  const firestore: any = await import('firebase/firestore');
  const q = firestore.query(firestore.collection(db, 'products'), firestore.where('tenantId', '==', tenantId));
  const snap = await firestore.getDocs(q);

  return snap.docs.map((docSnap: any) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Product, 'id'>),
  }));
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  const db = await getDb();
  if (!db) return null;
  const firestore: any = await import('firebase/firestore');
  const ref = firestore.doc(db, 'products', productId);
  const snap = (await firestore.getDoc(ref)) as any;
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Product, 'id'>) };
}

export async function createProduct(tenantId: string, input: Omit<Product, 'id'>): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore = await import('firebase/firestore');
  const ref = await firestore.addDoc(firestore.collection(db, 'products'), {
    ...input,
    tenantId,
    createdAt: firestore.serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(productId: string, updates: Partial<Omit<Product, 'id'>>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore = await import('firebase/firestore');
  const ref = firestore.doc(db, 'products', productId);
  await firestore.setDoc(ref, { ...updates, updatedAt: firestore.serverTimestamp() }, { merge: true });
}

export async function deleteProduct(productId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore = await import('firebase/firestore');
  const ref = firestore.doc(db, 'products', productId);
  await firestore.deleteDoc(ref);
}
