import AsyncStorage from '@react-native-async-storage/async-storage';
const create = (require('zustand') as any).create as typeof import('zustand').create;
const { createJSONStorage, persist } = (require('zustand/middleware') as any) as typeof import('zustand/middleware');

import type { PurchaseOrder } from '../types/purchaseTypes';

type PurchaseState = {
  purchases: PurchaseOrder[];
  upsertPurchase: (purchase: PurchaseOrder) => void;
  removePurchase: (purchaseId: string) => void;
};

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set) => ({
      purchases: [],
      upsertPurchase: (purchase) => {
        set((state) => {
          const exists = state.purchases.some((item) => item.id === purchase.id);
          return {
            purchases: exists
              ? state.purchases.map((item) => (item.id === purchase.id ? purchase : item))
              : [purchase, ...state.purchases],
          };
        });
      },
      removePurchase: (purchaseId) => {
        set((state) => ({
          purchases: state.purchases.filter((purchase) => purchase.id !== purchaseId),
        }));
      },
    }),
    {
      name: 'purchase-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
