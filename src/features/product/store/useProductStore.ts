import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Product } from '../types/productTypes';

type ProductState = {
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  clearProducts: () => void;
};

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      products: [],
      setProducts: (products) => {
        set({ products });
      },
      addProduct: (product) => {
        set((state) => ({ products: [...state.products, product] }));
      },
      removeProduct: (productId) => {
        set((state) => ({
          products: state.products.filter((product) => product.id !== productId),
        }));
      },
      clearProducts: () => {
        set({ products: [] });
      },
    }),
    {
      name: 'product-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
