const create = (require('zustand') as any).create as typeof import('zustand').create;
import type { ProductInventorySummary } from '../types/inventoryTypes';

interface InventoryState {
  summaries: ProductInventorySummary[];
  loading: boolean;
  error?: string | null;
  setSummaries: (s: ProductInventorySummary[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e?: string | null) => void;
}

export const useInventoryStore = create<InventoryState>()((set) => ({
  summaries: [],
  loading: false,
  error: null,
  setSummaries: (s: ProductInventorySummary[]) => set({ summaries: s }),
  setLoading: (v: boolean) => set({ loading: v }),
  setError: (e?: string | null) => set({ error: e }),
}));
