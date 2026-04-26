import AsyncStorage from '@react-native-async-storage/async-storage';
const create = (require('zustand') as any).create as typeof import('zustand').create;
const { createJSONStorage, persist } = (require('zustand/middleware') as any) as typeof import('zustand/middleware');

import type { Tenant } from '../types/tenantTypes';

const DEMO_TENANTS: Tenant[] = [
  {
    id: 'tn_001',
    name: 'Downtown Meatshop',
    subscriptionId: 'sub_001',
    plan: 'standard',
  },
];

type TenantState = {
  tenants: Tenant[];
  activeTenantId: string | null;
  setActiveTenant: (tenantId: string) => void;
  clearActiveTenant: () => void;
};

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenants: DEMO_TENANTS,
      activeTenantId: DEMO_TENANTS[0]?.id ?? null,
      setActiveTenant: (tenantId) => {
        set({ activeTenantId: tenantId });
      },
      clearActiveTenant: () => {
        set({ activeTenantId: null });
      },
    }),
    {
      name: 'tenant-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
