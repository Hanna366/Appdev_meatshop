import type { PlanDefinition } from '../types/subscriptionTypes';

export const PLAN_CATALOG: Record<PlanDefinition['id'], PlanDefinition> = {
  basic: {
    id: 'basic',
    displayName: 'Basic',
    rank: 1,
    entitlements: {
      featureFlags: {
        canUsePOS: true,
        canExportReports: false,
        canManageProducts: true,
        canUseOfflineMode: false,
        canViewAuditLogs: false,
        canManageUsers: false,
        canUseMultiBranch: false,
      },
      limits: {
        maxUsers: 2,
        maxProducts: 100,
        maxMonthlyTransactions: 1000,
        maxBranches: 1,
      },
    },
  },
  standard: {
    id: 'standard',
    displayName: 'Standard',
    rank: 2,
    entitlements: {
      featureFlags: {
        canUsePOS: true,
        canExportReports: true,
        canManageProducts: true,
        canUseOfflineMode: true,
        canViewAuditLogs: true,
        canManageUsers: true,
        canUseMultiBranch: false,
      },
      limits: {
        maxUsers: 10,
        maxProducts: 1000,
        maxMonthlyTransactions: 10000,
        maxBranches: 2,
      },
    },
  },
  premium: {
    id: 'premium',
    displayName: 'Premium',
    rank: 3,
    entitlements: {
      featureFlags: {
        canUsePOS: true,
        canExportReports: true,
        canManageProducts: true,
        canUseOfflineMode: true,
        canViewAuditLogs: true,
        canManageUsers: true,
        canUseMultiBranch: true,
      },
      limits: {
        maxUsers: 30,
        maxProducts: 10000,
        maxMonthlyTransactions: 50000,
        maxBranches: 10,
      },
    },
  },
  enterprise: {
    id: 'enterprise',
    displayName: 'Enterprise',
    rank: 4,
    entitlements: {
      featureFlags: {
        canUsePOS: true,
        canExportReports: true,
        canManageProducts: true,
        canUseOfflineMode: true,
        canViewAuditLogs: true,
        canManageUsers: true,
        canUseMultiBranch: true,
      },
      limits: {
        maxUsers: null,
        maxProducts: null,
        maxMonthlyTransactions: null,
        maxBranches: null,
      },
    },
  },
};
