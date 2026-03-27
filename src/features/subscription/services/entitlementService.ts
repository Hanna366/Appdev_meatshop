import { PLAN_CATALOG } from '../config/planCatalog';
import type {
  EntitlementDecision,
  FeatureFlag,
  LimitKey,
  PlanDefinition,
  PlanId,
  Subscription,
  UsageSnapshot,
} from '../types/subscriptionTypes';

const FEATURE_PLAN_REQUIREMENT: Record<FeatureFlag, PlanId> = {
  canUsePOS: 'basic',
  canExportReports: 'standard',
  canManageProducts: 'basic',
  canUseOfflineMode: 'standard',
  canViewAuditLogs: 'standard',
  canManageUsers: 'standard',
  canUseMultiBranch: 'premium',
};

const LIMIT_PLAN_REQUIREMENT: Record<LimitKey, PlanId> = {
  maxUsers: 'standard',
  maxProducts: 'standard',
  maxMonthlyTransactions: 'standard',
  maxBranches: 'premium',
};

const LIMIT_TO_USAGE_KEY: Record<LimitKey, keyof UsageSnapshot> = {
  maxUsers: 'activeUsers',
  maxProducts: 'productsCount',
  maxMonthlyTransactions: 'monthlyTransactions',
  maxBranches: 'branchesCount',
};

export function getPlanDefinition(planId: PlanId): PlanDefinition {
  return PLAN_CATALOG[planId];
}

export function isSubscriptionActive(subscription: Subscription): boolean {
  return subscription.status === 'active' || subscription.status === 'trialing';
}

export function canUseFeature(subscription: Subscription, feature: FeatureFlag): boolean {
  if (!isSubscriptionActive(subscription)) {
    return false;
  }

  const plan = getPlanDefinition(subscription.planId);
  return plan.entitlements.featureFlags[feature];
}

export function isWithinLimit(
  subscription: Subscription,
  usage: UsageSnapshot,
  limitKey: LimitKey,
  unitsToAdd = 1,
): boolean {
  if (!isSubscriptionActive(subscription)) {
    return false;
  }

  const plan = getPlanDefinition(subscription.planId);
  const limit = plan.entitlements.limits[limitKey];

  if (limit === null) {
    return true;
  }

  const usageKey = LIMIT_TO_USAGE_KEY[limitKey];
  return usage[usageKey] + unitsToAdd <= limit;
}

export function evaluateEntitlement(params: {
  subscription: Subscription;
  usage: UsageSnapshot;
  feature?: FeatureFlag;
  limitKey?: LimitKey;
  unitsToAdd?: number;
}): EntitlementDecision {
  const { subscription, usage, feature, limitKey, unitsToAdd = 1 } = params;

  if (!isSubscriptionActive(subscription)) {
    return {
      allowed: false,
      reason: 'subscription_inactive',
      message: 'Subscription is not active. Please update billing to continue.',
    };
  }

  if (feature && !canUseFeature(subscription, feature)) {
    return {
      allowed: false,
      reason: 'feature_locked',
      requiredPlan: FEATURE_PLAN_REQUIREMENT[feature],
      message: 'This feature is not included in the current plan.',
    };
  }

  if (limitKey && !isWithinLimit(subscription, usage, limitKey, unitsToAdd)) {
    return {
      allowed: false,
      reason: 'limit_exceeded',
      requiredPlan: LIMIT_PLAN_REQUIREMENT[limitKey],
      message: 'Plan limit reached. Upgrade to increase available capacity.',
    };
  }

  return { allowed: true };
}
