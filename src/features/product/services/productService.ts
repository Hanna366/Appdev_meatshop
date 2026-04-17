import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { Product } from '../types/productTypes';

export async function fetchProductsByTenant(tenantId: string): Promise<Product[]> {
  const q = query(collection(db, 'products'), where('tenantId', '==', tenantId));
  const snap = await getDocs(q);

  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Product, 'id'>),
  }));
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  const ref = doc(db, 'products', productId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Product, 'id'>) };
}

export async function createProduct(tenantId: string, input: Omit<Product, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'products'), {
    ...input,
    tenantId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(productId: string, updates: Partial<Omit<Product, 'id'>>): Promise<void> {
  const ref = doc(db, 'products', productId);
  await setDoc(ref, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteProduct(productId: string): Promise<void> {
  const ref = doc(db, 'products', productId);
  await deleteDoc(ref);
}
