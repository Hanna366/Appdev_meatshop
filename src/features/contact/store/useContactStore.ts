import AsyncStorage from '@react-native-async-storage/async-storage';
const create = (require('zustand') as any).create as typeof import('zustand').create;
const { createJSONStorage, persist } = (require('zustand/middleware') as any) as typeof import('zustand/middleware');

import type { BusinessContact } from '../types/contactTypes';

const DEMO_CONTACTS: BusinessContact[] = [
  {
    id: 'sup_001',
    tenantId: 'tn_001',
    kind: 'supplier',
    name: 'Prime Cuts Supply',
    phone: '09171234567',
    email: 'supply@primecuts.test',
    notes: 'Main chilled-meat supplier.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cus_001',
    tenantId: 'tn_001',
    kind: 'customer',
    name: 'Walk-in Retail',
    phone: 'N/A',
    email: '',
    notes: 'Default retail customer profile.',
    createdAt: new Date().toISOString(),
  },
];

type ContactState = {
  contacts: BusinessContact[];
  upsertContact: (contact: BusinessContact) => void;
  removeContact: (contactId: string) => void;
  clearContacts: () => void;
};

export const useContactStore = create<ContactState>()(
  persist(
    (set) => ({
      contacts: DEMO_CONTACTS,
      upsertContact: (contact) => {
        set((state) => {
          const exists = state.contacts.some((item) => item.id === contact.id);
          return {
            contacts: exists
              ? state.contacts.map((item) => (item.id === contact.id ? contact : item))
              : [contact, ...state.contacts],
          };
        });
      },
      removeContact: (contactId) => {
        set((state) => ({
          contacts: state.contacts.filter((contact) => contact.id !== contactId),
        }));
      },
      clearContacts: () => {
        set({ contacts: [] });
      },
    }),
    {
      name: 'contact-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
