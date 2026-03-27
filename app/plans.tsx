import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { PLAN_CATALOG } from '../src/features/subscription/config/planCatalog';
import { useSubscriptionStore } from '../src/features/subscription/store/useSubscriptionStore';
import type {
  PlanDefinition,
  PlanId,
  SubscriptionStatus,
} from '../src/features/subscription/types/subscriptionTypes';
import { useTenantStore } from '../src/features/tenant/store/useTenantStore';

const STATUS_OPTIONS: SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
  'paused',
  'canceled',
  'expired',
];

const PLAN_PRICES: Record<PlanId, number> = {
  basic: 999,
  standard: 1999,
  premium: 3499,
  enterprise: 8999,
};

const MOST_POPULAR_PLAN: PlanId = 'standard';

type FeatureItemProps = {
  label: string;
  enabled: boolean;
};

function FeatureItem({ label, enabled }: FeatureItemProps) {
  return (
    <View style={styles.featureRow}>
      <Text style={[styles.featureIcon, enabled ? styles.featureIconEnabled : styles.featureIconDisabled]}>
        {enabled ? '✓' : '✗'}
      </Text>
      <Text style={[styles.featureText, !enabled && styles.featureTextDisabled]}>{label}</Text>
    </View>
  );
}

function getPlanCtaLabel(currentPlan: PlanDefinition, targetPlan: PlanDefinition, isCurrent: boolean): string {
  if (isCurrent) {
    return 'Current Plan';
  }

  if (targetPlan.rank > currentPlan.rank) {
    return `Upgrade to ${targetPlan.displayName}`;
  }

  return `Switch to ${targetPlan.displayName}`;
}

function formatLimit(value: number | null): string {
  return value === null ? 'Unlimited' : String(value);
}

export default function PlansScreen() {
  const activeTenantId = useTenantStore((state) => state.activeTenantId);
  const tenants = useTenantStore((state) => state.tenants);

  const subscriptionsByTenantId = useSubscriptionStore((state) => state.subscriptionsByTenantId);
  const usageByTenantId = useSubscriptionStore((state) => state.usageByTenantId);
  const setTenantPlan = useSubscriptionStore((state) => state.setTenantPlan);
  const setSubscriptionStatus = useSubscriptionStore((state) => state.setSubscriptionStatus);
  const patchUsage = useSubscriptionStore((state) => state.patchUsage);

  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const activeSubscription = activeTenantId ? subscriptionsByTenantId[activeTenantId] : undefined;
  const activeUsage = activeTenantId ? usageByTenantId[activeTenantId] : undefined;

  const orderedPlans = useMemo(
    () => Object.values(PLAN_CATALOG).sort((a, b) => a.rank - b.rank),
    [],
  );

  if (!activeTenantId || !activeTenant || !activeSubscription) {
    return (
      <ScreenContainer>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Plans & Billing</Text>
          <Text style={styles.emptyText}>
            No active tenant or subscription found. Select a tenant before managing plans.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const currentPlan = PLAN_CATALOG[activeSubscription.planId];

  return (
    <ScreenContainer contentStyle={styles.contentContainer}>
      <View style={styles.root}>
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Plans & Billing</Text>
          <Text style={styles.pageSubtitle}>Choose a plan that matches your store growth.</Text>
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.accountName}>{activeTenant.name}</Text>
          <Text style={styles.accountMeta}>Current plan: {activeSubscription.planId}</Text>
          <Text style={styles.accountMeta}>Status: {activeSubscription.status}</Text>
          <Text style={styles.accountMeta}>
            Billing period: {new Date(activeSubscription.currentPeriodStart).toLocaleDateString()} -{' '}
            {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.usageCard}>
          <Text style={styles.sectionTitle}>Usage Snapshot</Text>
          <Text style={styles.usageText}>Users: {activeUsage?.activeUsers ?? 0}</Text>
          <Text style={styles.usageText}>Products: {activeUsage?.productsCount ?? 0}</Text>
          <Text style={styles.usageText}>
            Monthly transactions: {activeUsage?.monthlyTransactions ?? 0}
          </Text>
          <Text style={styles.usageText}>Branches: {activeUsage?.branchesCount ?? 0}</Text>

          <PrimaryButton
            label="Reset Usage (Demo)"
            variant="secondary"
            onPress={() => {
              patchUsage(activeTenantId, {
                activeUsers: 0,
                productsCount: 0,
                monthlyTransactions: 0,
                branchesCount: 0,
              });
            }}
          />
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Subscription Status</Text>
          {STATUS_OPTIONS.map((status) => {
            const isActiveStatus = activeSubscription.status === status;
            return (
              <PrimaryButton
                key={status}
                label={isActiveStatus ? `Current: ${status}` : `Set status: ${status}`}
                variant={isActiveStatus ? 'primary' : 'secondary'}
                onPress={() => setSubscriptionStatus(activeTenantId, status)}
                disabled={isActiveStatus}
              />
            );
          })}
        </View>

        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          {orderedPlans.map((plan) => {
            const isCurrent = activeSubscription.planId === plan.id;
            const isPopular = plan.id === MOST_POPULAR_PLAN;
            const ctaLabel = getPlanCtaLabel(currentPlan, plan, isCurrent);

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  isCurrent && styles.currentPlanCard,
                  isPopular && styles.popularPlanCard,
                ]}
              >
                {isPopular ? (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                ) : null}

                <Text style={styles.planName}>{plan.displayName}</Text>
                <View style={styles.priceWrap}>
                  <Text style={styles.priceText}>₱{PLAN_PRICES[plan.id].toLocaleString()}</Text>
                  <Text style={styles.pricePeriod}>/month</Text>
                </View>

                <View style={styles.featureList}>
                  <FeatureItem
                    label="Point of Sale"
                    enabled={plan.entitlements.featureFlags.canUsePOS}
                  />
                  <FeatureItem
                    label="Export Reports"
                    enabled={plan.entitlements.featureFlags.canExportReports}
                  />
                  <FeatureItem
                    label="Offline Mode"
                    enabled={plan.entitlements.featureFlags.canUseOfflineMode}
                  />
                  <FeatureItem
                    label="Multi-branch"
                    enabled={plan.entitlements.featureFlags.canUseMultiBranch}
                  />
                </View>

                <View style={styles.limitWrap}>
                  <Text style={styles.limitText}>Users: {formatLimit(plan.entitlements.limits.maxUsers)}</Text>
                  <Text style={styles.limitText}>
                    Products: {formatLimit(plan.entitlements.limits.maxProducts)}
                  </Text>
                  <Text style={styles.limitText}>
                    Tx/month: {formatLimit(plan.entitlements.limits.maxMonthlyTransactions)}
                  </Text>
                  <Text style={styles.limitText}>
                    Branches: {formatLimit(plan.entitlements.limits.maxBranches)}
                  </Text>
                </View>

                <PrimaryButton
                  label={ctaLabel}
                  onPress={() => setTenantPlan(activeTenantId, plan.id)}
                  disabled={isCurrent}
                  variant={isCurrent ? 'secondary' : isPopular ? 'primary' : 'secondary'}
                />
              </View>
            );
          })}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 30,
  },
  root: {
    gap: 16,
  },
  headerSection: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 29,
    fontWeight: '800',
    color: '#1F1A14',
    letterSpacing: 0.2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6E6456',
    lineHeight: 20,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECE4D8',
    padding: 15,
    gap: 4,
    shadowColor: '#2B241C',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D2720',
  },
  accountMeta: {
    fontSize: 13,
    color: '#655D51',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F2821',
  },
  usageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECE4D8',
    padding: 15,
    gap: 8,
  },
  usageText: {
    color: '#5D5548',
    fontSize: 13,
  },
  statusSection: {
    gap: 8,
  },
  pricingSection: {
    gap: 12,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8DED0',
    padding: 16,
    gap: 12,
    shadowColor: '#2A231B',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  currentPlanCard: {
    borderColor: '#B75A2A',
  },
  popularPlanCard: {
    borderColor: '#A53C21',
    backgroundColor: '#FFFDF9',
  },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#A53C21',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  popularBadgeText: {
    color: '#FFF8EF',
    fontSize: 12,
    fontWeight: '700',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2A241D',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  priceText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1F1A14',
    letterSpacing: -0.3,
  },
  pricePeriod: {
    fontSize: 14,
    color: '#6E6457',
    marginBottom: 6,
  },
  featureList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 22,
    fontSize: 15,
    fontWeight: '700',
  },
  featureIconEnabled: {
    color: '#2A8A52',
  },
  featureIconDisabled: {
    color: '#A78061',
  },
  featureText: {
    color: '#3A3228',
    fontSize: 14,
    fontWeight: '600',
  },
  featureTextDisabled: {
    color: '#8B8072',
  },
  limitWrap: {
    backgroundColor: '#F8F3EA',
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  limitText: {
    color: '#6A5E4E',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    gap: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B1B18',
  },
  emptyText: {
    color: '#5A5448',
    lineHeight: 20,
  },
});
