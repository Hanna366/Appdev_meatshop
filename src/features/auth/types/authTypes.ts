import type { UserRole } from '../../access/types/accessTypes';

export type User = {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  role: UserRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};
