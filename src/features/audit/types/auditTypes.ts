export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'products.view'
  | 'products.seed'
  | 'sync.enqueue';

export type AuditEvent = {
  id: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  createdAt: string;
  meta?: Record<string, string>;
};
