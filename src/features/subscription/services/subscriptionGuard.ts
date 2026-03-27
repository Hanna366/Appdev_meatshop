import { evaluateEntitlement } from './entitlementService';
import type {
  EntitlementDecision,
  FeatureFlag,
  LimitKey,
  Subscription,
  UsageSnapshot,
} from '../types/subscriptionTypes';

type GuardParams = {
  subscription: Subscription;
  usage: UsageSnapshot;
  requiredFeature?: FeatureFlag;
  requiredLimit?: LimitKey;
  unitsToAdd?: number;
  onDenied?: (decision: EntitlementDecision) => void;
};

export function guardSubscriptionAccess(params: GuardParams): boolean {
  const decision = evaluateEntitlement({
    subscription: params.subscription,
    usage: params.usage,
    feature: params.requiredFeature,
    limitKey: params.requiredLimit,
    unitsToAdd: params.unitsToAdd,
  });

  if (!decision.allowed && params.onDenied) {
    params.onDenied(decision);
  }

  return decision.allowed;
}
