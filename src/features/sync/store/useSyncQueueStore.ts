import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SyncQueueItem } from '../types/syncTypes';

type SyncQueueState = {
  queue: SyncQueueItem[];
  enqueue: (item: SyncQueueItem) => void;
  dequeue: () => SyncQueueItem | null;
  clearQueue: () => void;
};

export const useSyncQueueStore = create<SyncQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      enqueue: (item) => {
        set((state) => ({ queue: [...state.queue, item] }));
      },
      dequeue: () => {
        const state = get();
        const [first, ...rest] = state.queue;

        if (!first) {
          return null;
        }

        set({ queue: rest });
        return first;
      },
      clearQueue: () => {
        set({ queue: [] });
      },
    }),
    {
      name: 'sync-queue-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
