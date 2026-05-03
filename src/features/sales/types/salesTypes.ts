export type SalePaymentMethod = 'cash' | 'gcash' | 'card';
export type SaleStatus = 'completed' | 'queued_offline';

export type SaleLine = {
  id: string;
  productId: string;
  productName: string;
  weightKg: number;
  unitPrice: number;
  lineTotal: number;
};

export type SaleRecord = {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  paymentMethod: SalePaymentMethod;
  status: SaleStatus;
  mode: 'online' | 'offline';
  subtotal: number;
  totalWeightKg: number;
  lines: SaleLine[];
  createdAt: string;
  syncedAt?: string;
};
