export type Timestamp = any;

export type TenantId = string;

export interface ProductInventorySummary {
  productId: string;
  productName?: string;
  tenantId: TenantId;
  totalQuantity: number; // sum of all remainingQuantity across batches
  reservedQuantity?: number; // optional reserved for orders
  lowStockThreshold?: number;
  lowStock: boolean;
  batchesCount: number;
  nextExpiryDate?: Timestamp | string | null;
}

export interface InventoryBatch {
  id?: string;
  tenantId: TenantId;
  productId: string;
  quantity: number;
  remainingQuantity: number;
  cost?: number;
  supplierId?: string;
  receivedAt: Timestamp | string;
  expiryDate?: Timestamp | string | null;
  createdBy?: string;
  createdAt?: Timestamp | string | any;
  notes?: string;
}

export type InventoryTransactionType = 'stock_in' | 'stock_out' | 'waste' | 'adjustment' | 'transfer';

export interface InventoryTransaction {
  id?: string;
  tenantId: TenantId;
  productId: string;
  type: InventoryTransactionType;
  quantity: number; // positive for in, negative for out/waste when appropriate
  batchId?: string | null;
  relatedId?: string | null; // e.g., receiving id, purchase id, sale id
  reason?: string;
  meta?: Record<string, any>;
  createdBy?: string;
  createdAt?: Timestamp | string | any;
}

export interface StockAdjustmentInput {
  tenantId: TenantId;
  productId: string;
  quantity: number; // positive or negative
  reason: string;
  notes?: string;
  userId?: string;
}

export interface StockInInput {
  tenantId: TenantId;
  productId: string;
  quantity: number;
  cost?: number;
  supplierId?: string;
  expiryDate?: Timestamp | string | null;
  receivedAt?: Timestamp | string;
  notes?: string;
  userId?: string;
}

export interface WasteLogInput {
  tenantId: TenantId;
  productId: string;
  quantity: number;
  batchId?: string | null; // if omitted, will deplete FIFO
  reason: string;
  notes?: string;
  userId?: string;
}

export interface FetchInventoryOptions {
  tenantId: TenantId;
}
