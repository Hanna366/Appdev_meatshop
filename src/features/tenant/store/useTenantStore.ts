import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
