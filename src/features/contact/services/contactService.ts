import { getDb } from '../../../lib/firebase';
import type { BusinessContact } from '../types/contactTypes';

const CONTACTS = 'businessContacts';

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

function mapContact(docSnap: any): BusinessContact {
  const data = docSnap.data() as Partial<BusinessContact> & Record<string, unknown>;
  return {
    id: docSnap.id,
    tenantId: String(data.tenantId ?? ''),
    kind: data.kind === 'customer' ? 'customer' : 'supplier',
    name: String(data.name ?? ''),
    phone: String(data.phone ?? ''),
    email: typeof data.email === 'string' ? data.email : '',
    notes: typeof data.notes === 'string' ? data.notes : '',
    createdAt: normalizeDate(data.createdAt),
    updatedAt: data.updatedAt ? normalizeDate(data.updatedAt) : undefined,
  };
}

export async function fetchContactsByTenant(tenantId: string): Promise<BusinessContact[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const firestore: any = await import('firebase/firestore');
  const q = firestore.query(firestore.collection(db, CONTACTS), firestore.where('tenantId', '==', tenantId));
  const snap = await firestore.getDocs(q);

  return snap.docs
    .map((docSnap: any) => mapContact(docSnap))
    .sort((left: BusinessContact, right: BusinessContact) => left.name.localeCompare(right.name));
}

export async function createBusinessContact(contact: BusinessContact): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const firestore: any = await import('firebase/firestore');
  const ref = firestore.doc(db, CONTACTS, contact.id);
  await firestore.setDoc(ref, {
    tenantId: contact.tenantId,
    kind: contact.kind,
    name: contact.name,
    phone: contact.phone,
    email: contact.email ?? '',
    notes: contact.notes ?? '',
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt ?? contact.createdAt,
  });
  return ref.id;
}

export async function updateBusinessContact(
  contactId: string,
  updates: Partial<Omit<BusinessContact, 'id'>>,
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const firestore: any = await import('firebase/firestore');
  const ref = firestore.doc(db, CONTACTS, contactId);
  await firestore.setDoc(
    ref,
    {
      ...updates,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function deleteBusinessContact(contactId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const firestore: any = await import('firebase/firestore');
  const ref = firestore.doc(db, CONTACTS, contactId);
  await firestore.deleteDoc(ref);
}
