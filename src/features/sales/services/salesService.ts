import { getDb } from '../../../lib/firebase';
import type { SaleRecord } from '../types/salesTypes';

const SALES = 'sales';

export async function saveSaleRecord(sale: SaleRecord): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const firestore: any = await import('firebase/firestore');
  const ref = firestore.doc(db, SALES, sale.id);
  await firestore.setDoc(
    ref,
    {
      ...sale,
      updatedAt: firestore.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function fetchSalesByTenant(tenantId: string): Promise<SaleRecord[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const firestore: any = await import('firebase/firestore');
  const q = firestore.query(
    firestore.collection(db, SALES),
    firestore.where('tenantId', '==', tenantId),
    firestore.orderBy('createdAt', 'desc'),
  );
  const snap = await firestore.getDocs(q);

  return snap.docs.map((docSnap: any) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<SaleRecord, 'id'>),
  }));
}
