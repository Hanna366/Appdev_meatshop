import type { PlanId } from '../../subscription/types/subscriptionTypes';

export type Tenant = {
  id: string;
  name: string;
  subscriptionId: string;
  plan: PlanId;
};
