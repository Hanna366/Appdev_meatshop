import type { PermissionAction, UserRole } from '../types/accessTypes';

type PermissionMap = Record<UserRole, PermissionAction[]>;

export const permissionMatrix: PermissionMap = {
  owner: [
    'products.view',
    'products.edit',
    'pos.checkout',
    'pos.void',
    'purchase.create',
    'purchase.receive',
    'reports.view',
    'audit.view',
    'users.manage',
  ],
  manager: [
    'products.view',
    'products.edit',
    'pos.checkout',
    'pos.void',
    'purchase.create',
    'purchase.receive',
    'reports.view',
    'audit.view',
  ],
  cashier: ['products.view', 'pos.checkout'],
  inventory_clerk: ['products.view', 'products.edit', 'purchase.create', 'purchase.receive'],
};
