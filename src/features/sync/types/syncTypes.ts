export type SyncEntity = 'product' | 'purchase' | 'pos_transaction';

export type SyncOperation = 'create' | 'update' | 'delete';

export type SyncQueueItem = {
  id: string;
  tenantId: string;
  entity: SyncEntity;
  operation: SyncOperation;
  payload: Record<string, string | number | boolean>;
  queuedAt: string;
};
