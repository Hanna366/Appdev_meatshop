import AsyncStorage from '@react-native-async-storage/async-storage';
const create = (require('zustand') as any).create as typeof import('zustand').create;
const { createJSONStorage, persist } = (require('zustand/middleware') as any) as typeof import('zustand/middleware');

import type { SaleRecord } from '../types/salesTypes';

type SalesState = {
  sales: SaleRecord[];
  upsertSale: (sale: SaleRecord) => void;
  removeSale: (saleId: string) => void;
};

export const useSalesStore = create<SalesState>()(
  persist(
    (set) => ({
      sales: [],
      upsertSale: (sale) => {
        set((state) => {
          const exists = state.sales.some((item) => item.id === sale.id);
          return {
            sales: exists
              ? state.sales.map((item) => (item.id === sale.id ? sale : item))
              : [sale, ...state.sales],
          };
        });
      },
      removeSale: (saleId) => {
        set((state) => ({
          sales: state.sales.filter((sale) => sale.id !== saleId),
        }));
      },
    }),
    {
      name: 'sales-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
