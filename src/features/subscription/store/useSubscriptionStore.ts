import AsyncStorage from '@react-native-async-storage/async-storage';
const create = (require('zustand') as any).create as typeof import('zustand').create;
const { createJSONStorage, persist } = (require('zustand/middleware') as any) as typeof import('zustand/middleware');

import type {
  PlanId,
  Subscription,
  SubscriptionStatus,
  UsageSnapshot,
} from '../types/subscriptionTypes';

type SubscriptionsByTenantId = Record<string, Subscription>;
type UsageByTenantId = Record<string, UsageSnapshot>;

const now = new Date();
const nextMonth = new Date(now);
nextMonth.setMonth(nextMonth.getMonth() + 1);

const DEMO_SUBSCRIPTIONS: SubscriptionsByTenantId = {
  tn_001: {
    id: 'sub_001',
    tenantId: 'tn_001',
    planId: 'standard',
    status: 'active',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: nextMonth.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
};

const DEMO_USAGE: UsageByTenantId = {
  tn_001: {
    activeUsers: 3,
    productsCount: 8,
    monthlyTransactions: 124,
    branchesCount: 1,
  },
};

type SubscriptionState = {
  subscriptionsByTenantId: SubscriptionsByTenantId;
  usageByTenantId: UsageByTenantId;
  setTenantPlan: (tenantId: string, planId: PlanId) => void;
  setSubscriptionStatus: (tenantId: string, status: SubscriptionStatus) => void;
  patchUsage: (tenantId: string, patch: Partial<UsageSnapshot>) => void;
  incrementUsage: (tenantId: string, field: keyof UsageSnapshot, amount?: number) => void;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      subscriptionsByTenantId: DEMO_SUBSCRIPTIONS,
      usageByTenantId: DEMO_USAGE,
      setTenantPlan: (tenantId, planId) => {
        set((state) => {
          const current = state.subscriptionsByTenantId[tenantId];
          if (!current) {
            return state;
          }

          return {
            subscriptionsByTenantId: {
              ...state.subscriptionsByTenantId,
              [tenantId]: {
                ...current,
                planId,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },
      setSubscriptionStatus: (tenantId, status) => {
        set((state) => {
          const current = state.subscriptionsByTenantId[tenantId];
          if (!current) {
            return state;
          }

          return {
            subscriptionsByTenantId: {
              ...state.subscriptionsByTenantId,
              [tenantId]: {
                ...current,
                status,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },
      patchUsage: (tenantId, patch) => {
        set((state) => {
          const current =
            state.usageByTenantId[tenantId] ??
            ({
              activeUsers: 0,
              productsCount: 0,
              monthlyTransactions: 0,
              branchesCount: 0,
            } as UsageSnapshot);

          return {
            usageByTenantId: {
              ...state.usageByTenantId,
              [tenantId]: {
                ...current,
                ...patch,
              },
            },
          };
        });
      },
      incrementUsage: (tenantId, field, amount = 1) => {
        set((state) => {
          const current =
            state.usageByTenantId[tenantId] ??
            ({
              activeUsers: 0,
              productsCount: 0,
              monthlyTransactions: 0,
              branchesCount: 0,
            } as UsageSnapshot);

          return {
            usageByTenantId: {
              ...state.usageByTenantId,
              [tenantId]: {
                ...current,
                [field]: current[field] + amount,
              },
            },
          };
        });
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
