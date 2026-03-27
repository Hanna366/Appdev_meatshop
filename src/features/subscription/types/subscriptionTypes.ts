export type PlanId = 'basic' | 'standard' | 'premium' | 'enterprise';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'canceled'
  | 'expired';

export type FeatureFlag =
  | 'canUsePOS'
  | 'canExportReports'
  | 'canManageProducts'
  | 'canUseOfflineMode'
  | 'canViewAuditLogs'
  | 'canManageUsers'
  | 'canUseMultiBranch';

export type LimitKey = 'maxUsers' | 'maxProducts' | 'maxMonthlyTransactions' | 'maxBranches';

export type PlanLimits = Record<LimitKey, number | null>;

export type PlanEntitlements = {
  featureFlags: Record<FeatureFlag, boolean>;
  limits: PlanLimits;
};

export type PlanDefinition = {
  id: PlanId;
  displayName: string;
  rank: number;
  entitlements: PlanEntitlements;
};

export type Subscription = {
  id: string;
  tenantId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  canceledAt?: string;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UsageSnapshot = {
  activeUsers: number;
  productsCount: number;
  monthlyTransactions: number;
  branchesCount: number;
};

export type EntitlementDecision = {
  allowed: boolean;
  reason?: 'subscription_inactive' | 'feature_locked' | 'limit_exceeded';
  message?: string;
  requiredPlan?: PlanId;
};
