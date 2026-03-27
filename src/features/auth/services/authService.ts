import type { LoginPayload, User } from '../types/authTypes';

const DEMO_CREDENTIALS = {
  email: 'demo@meatshop.app',
  password: 'password123',
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const authService = {
  async login(payload: LoginPayload): Promise<User> {
    await delay(450);

    if (
      payload.email.toLowerCase() !== DEMO_CREDENTIALS.email ||
      payload.password !== DEMO_CREDENTIALS.password
    ) {
      throw new Error('Invalid credentials. Please use the demo account.');
    }

    return {
      id: 'usr_001',
      name: 'Demo Manager',
      email: DEMO_CREDENTIALS.email,
      tenantId: 'tn_001',
      role: 'manager',
    };
  },
};
