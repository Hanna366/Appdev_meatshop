import { getDb } from '../../../lib/firebase';
import type { Product } from '../types/productTypes';

export type ProductFetchSource = 'default' | 'server';

function getProductsCollection(firestore: any, db: any, tenantId: string) {
  return firestore.collection(db, 'tenants', tenantId, 'products');
}

function getProductDoc(firestore: any, db: any, tenantId: string, productId: string) {
  return firestore.doc(db, 'tenants', tenantId, 'products', productId);
}

async function getProductsSnapshot(
  firestore: any,
  collectionRef: any,
  source: ProductFetchSource = 'default',
) {
  if (source === 'server' && typeof firestore.getDocsFromServer === 'function') {
    return firestore.getDocsFromServer(collectionRef);
  }

  return firestore.getDocs(collectionRef);
}

async function getProductSnapshot(
  firestore: any,
  docRef: any,
  source: ProductFetchSource = 'default',
) {
  if (source === 'server' && typeof firestore.getDocFromServer === 'function') {
    return firestore.getDocFromServer(docRef);
  }

  return firestore.getDoc(docRef);
}

function mapProductSnapshot(docSnap: any): Product {
  return {
    id: docSnap.id,
    ...(docSnap.data() as Omit<Product, 'id'>),
  };
}

export async function fetchProductsByTenant(
  tenantId: string,
  options?: { source?: ProductFetchSource },
): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  const firestore: any = await import('firebase/firestore');
  const snap = await getProductsSnapshot(
    firestore,
    getProductsCollection(firestore, db, tenantId),
    options?.source,
  );

  return snap.docs.map(mapProductSnapshot);
}

export async function fetchProductById(
  tenantId: string,
  productId: string,
  options?: { source?: ProductFetchSource },
): Promise<Product | null> {
  const db = await getDb();
  if (!db) return null;
  const firestore: any = await import('firebase/firestore');
  const ref = getProductDoc(firestore, db, tenantId, productId);
  const snap = (await getProductSnapshot(firestore, ref, options?.source)) as any;
  if (!snap.exists()) return null;
  return mapProductSnapshot(snap);
}

export async function createProduct(tenantId: string, input: Omit<Product, 'id'>): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore = await import('firebase/firestore');
  const ref = firestore.doc(getProductsCollection(firestore, db, tenantId));
  const timestamp = firestore.serverTimestamp();
  await firestore.setDoc(ref, {
    id: ref.id,
    tenantId,
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const createdSnap = await getProductSnapshot(firestore, ref, 'server');
  if (!createdSnap.exists()) {
    throw new Error('Product was not persisted to Firestore');
  }

  return ref.id;
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  updates: Partial<Omit<Product, 'id'>>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore = await import('firebase/firestore');
  const ref = getProductDoc(firestore, db, tenantId, productId);
  await firestore.setDoc(
    ref,
    {
      ...updates,
      id: productId,
      tenantId,
      updatedAt: firestore.serverTimestamp(),
    },
    { merge: true },
  );

  const updatedSnap = await getProductSnapshot(firestore, ref, 'server');
  if (!updatedSnap.exists()) {
    throw new Error('Product update could not be verified in Firestore');
  }
}

export async function deleteProduct(tenantId: string, productId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Firestore not initialized');
  const firestore = await import('firebase/firestore');
  const ref = getProductDoc(firestore, db, tenantId, productId);
  await firestore.deleteDoc(ref);

  const deletedSnap = await getProductSnapshot(firestore, ref, 'server');
  if (deletedSnap.exists()) {
    throw new Error('Product delete could not be verified in Firestore');
  }
}
