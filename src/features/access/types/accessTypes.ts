export type UserRole = 'owner' | 'manager' | 'cashier' | 'inventory_clerk';

export type PermissionAction =
  | 'products.view'
  | 'products.edit'
  | 'pos.checkout'
  | 'pos.void'
  | 'purchase.create'
  | 'purchase.receive'
  | 'reports.view'
  | 'audit.view'
  | 'users.manage';
