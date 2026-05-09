import { getDb } from '../../../lib/firebase';
import type { PurchaseOrder } from '../types/purchaseTypes';

const PURCHASE_ORDERS = 'purchaseOrders';

function normalizeDate(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().toISOString();
  }

  return new Date().toISOString();
}

function mapPurchaseOrder(docSnap: any): PurchaseOrder {
  const data = docSnap.data() as Partial<PurchaseOrder> & Record<string, unknown>;
  return {
    id: docSnap.id,
    tenantId: String(data.tenantId ?? ''),
    supplierId: typeof data.supplierId === 'string' && data.supplierId.length > 0 ? data.supplierId : undefined,
    supplierName: String(data.supplierName ?? ''),
    productId: String(data.productId ?? ''),
    productName: String(data.productName ?? ''),
    quantity: Number(data.quantity ?? 0),
    cost: Number(data.cost ?? 0),
    expiryDate:
      typeof data.expiryDate === 'string' ? data.expiryDate : data.expiryDate == null ? null : normalizeDate(data.expiryDate),
    notes: typeof data.notes === 'string' ? data.notes : '',
    status: data.status === 'draft' || data.status === 'received' ? data.status : 'ordered',
    createdAt: normalizeDate(data.createdAt),
    receivedAt: data.receivedAt ? normalizeDate(data.receivedAt) : undefined,
  };
}

function toFirestorePurchaseOrder(purchase: Partial<PurchaseOrder>) {
  return {
    tenantId: purchase.tenantId ?? '',
    supplierId: purchase.supplierId ?? null,
    supplierName: purchase.supplierName ?? '',
    productId: purchase.productId ?? '',
    productName: purchase.productName ?? '',
    quantity: Number(purchase.quantity ?? 0),
    cost: Number(purchase.cost ?? 0),
    expiryDate: purchase.expiryDate ?? null,
    notes: purchase.notes ?? '',
    status: purchase.status ?? 'ordered',
    createdAt: purchase.createdAt ?? new Date().toISOString(),
    receivedAt: purchase.receivedAt ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function toFirestorePurchaseOrderUpdate(purchase: Partial<PurchaseOrder>) {
  const data: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (purchase.tenantId !== undefined) data.tenantId = purchase.tenantId;
  if (purchase.supplierId !== undefined) data.supplierId = purchase.supplierId ?? null;
  if (purchase.supplierName !== undefined) data.supplierName = purchase.supplierName;
  if (purchase.productId !== undefined) data.productId = purchase.productId;
  if (purchase.productName !== undefined) data.productName = purchase.productName;
  if (purchase.quantity !== undefined) data.quantity = Number(purchase.quantity);
  if (purchase.cost !== undefined) data.cost = Number(purchase.cost);
  if (purchase.expiryDate !== undefined) data.expiryDate = purchase.expiryDate ?? null;
  if (purchase.notes !== undefined) data.notes = purchase.notes ?? '';
  if (purchase.status !== undefined) data.status = purchase.status;
  if (purchase.createdAt !== undefined) data.createdAt = purchase.createdAt;
  if (purchase.receivedAt !== undefined) data.receivedAt = purchase.receivedAt ?? null;

  return data;
}

export async function fetchPurchaseOrdersByTenant(tenantId: string): Promise<PurchaseOrder[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const firestore: any = await import('firebase/firestore');
  const q = firestore.query(firestore.collection(db, PURCHASE_ORDERS), firestore.where('tenantId', '==', tenantId));
  const snap = await firestore.getDocs(q);

  return snap.docs
    .map((docSnap: any) => mapPurchaseOrder(docSnap))
    .sort((left: PurchaseOrder, right: PurchaseOrder) => right.createdAt.localeCompare(left.createdAt));
}

export async function createPurchaseOrder(purchase: PurchaseOrder): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const firestore: any = await import('firebase/firestore');
  const ref = firestore.doc(db, PURCHASE_ORDERS, purchase.id);
  await firestore.setDoc(ref, toFirestorePurchaseOrder(purchase));
  return ref.id;
}

export async function updatePurchaseOrder(
  purchaseId: string,
  updates: Partial<Omit<PurchaseOrder, 'id'>>,
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const firestore: any = await import('firebase/firestore');
  const ref = firestore.doc(db, PURCHASE_ORDERS, purchaseId);
  await firestore.setDoc(
    ref,
    toFirestorePurchaseOrderUpdate(updates),
    { merge: true },
  );
}

export async function deletePurchaseOrder(purchaseId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const firestore: any = await import('firebase/firestore');
  const ref = firestore.doc(db, PURCHASE_ORDERS, purchaseId);
  await firestore.deleteDoc(ref);
}
