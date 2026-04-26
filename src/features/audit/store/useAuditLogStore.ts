import AsyncStorage from '@react-native-async-storage/async-storage';
const create = (require('zustand') as any).create as typeof import('zustand').create;
const { createJSONStorage, persist } = (require('zustand/middleware') as any) as typeof import('zustand/middleware');

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
