export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received';

export type PurchaseOrder = {
  id: string;
  tenantId: string;
  supplierId?: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  expiryDate?: string | null;
  notes?: string;
  status: PurchaseOrderStatus;
  createdAt: string;
  receivedAt?: string;
};
