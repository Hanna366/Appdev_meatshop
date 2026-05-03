export type ContactKind = 'supplier' | 'customer';

export type BusinessContact = {
  id: string;
  tenantId: string;
  kind: ContactKind;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};
