import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuditEvent } from '../types/auditTypes';

const MAX_EVENTS = 250;

type AuditLogState = {
  events: AuditEvent[];
  appendEvent: (event: AuditEvent) => void;
  clearEvents: () => void;
};

export const useAuditLogStore = create<AuditLogState>()(
  persist(
    (set) => ({
      events: [],
      appendEvent: (event) => {
        set((state) => ({ events: [event, ...state.events].slice(0, MAX_EVENTS) }));
      },
      clearEvents: () => {
        set({ events: [] });
      },
    }),
    {
      name: 'audit-log-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
