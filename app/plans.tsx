import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  MEATSHOP_CARD_SHADOW,
  MEATSHOP_COLORS,
  MeatshopBottomTabBar,
  MeatshopShell,
  MeatshopSurfaceCard,
} from '../src/components/ui/MeatshopChrome';
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

const PLAN_PRICES: Record<PlanId, string> = {
  basic: '$29',
  standard: '$79',
  premium: '$149',
  enterprise: 'Custom',
};

const MOST_POPULAR_PLAN: PlanId = 'standard';

function FeatureItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={styles.featureRow}>
      <MaterialCommunityIcons
        name={enabled ? 'check-circle-outline' : 'close-circle-outline'}
        size={18}
        color={enabled ? '#2F8F59' : MEATSHOP_COLORS.maroon}
      />
      <Text style={[styles.featureText, !enabled && styles.featureTextDisabled]}>{label}</Text>
    </View>
  );
}

function getPlanCtaLabel(currentPlan: PlanDefinition, targetPlan: PlanDefinition, isCurrent: boolean): string {
  if (isCurrent) return 'Current Plan';
  if (targetPlan.rank > currentPlan.rank) return `Upgrade to ${targetPlan.displayName}`;
  return `Switch to ${targetPlan.displayName}`;
}

function formatLimit(value: number | null): string {
  return value === null ? 'Unlimited' : String(value);
}

function getPlanPeriodLabel(planId: PlanId): string {
  return planId === 'enterprise' ? 'Pricing' : '/month';
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PlansScreen() {
  const router = useRouter();
  const [hoveredPlanId, setHoveredPlanId] = useState<PlanId | null>(null);
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

  const orderedPlans = useMemo(() => Object.values(PLAN_CATALOG).sort((a, b) => a.rank - b.rank), []);

  if (!activeTenantId || !activeTenant || !activeSubscription) {
    return (
      <MeatshopShell>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Plans & Billing</Text>
        </View>
        <View style={styles.topDivider} />

        <View style={styles.emptyWrap}>
          <MeatshopSurfaceCard>
            <Text style={styles.emptyTitle}>Plans & Billing</Text>
            <Text style={styles.emptyText}>
              No active tenant or subscription found. Select a tenant before managing plans.
            </Text>
          </MeatshopSurfaceCard>
        </View>

        <MeatshopBottomTabBar
          active="plans"
          onDashboard={() => router.push('/dashboard')}
          onPlans={() => router.push('/plans')}
          onInventory={() => router.push('/inventory')}
          onReports={() => router.push('/reports')}
        />
      </MeatshopShell>
    );
  }

  const currentPlan = PLAN_CATALOG[activeSubscription.planId];
  const isHealthyStatus =
    activeSubscription.status === 'active' || activeSubscription.status === 'trialing';

  const usageMetrics = [
    {
      key: 'users',
      label: 'Users',
      value: String(activeUsage?.activeUsers ?? 0),
      icon: 'account-group-outline' as const,
    },
    {
      key: 'products',
      label: 'Products',
      value: String(activeUsage?.productsCount ?? 0),
      icon: 'package-variant-closed' as const,
    },
    {
      key: 'transactions',
      label: 'Monthly transactions',
      value: String(activeUsage?.monthlyTransactions ?? 0),
      icon: 'swap-horizontal' as const,
    },
    {
      key: 'branches',
      label: 'Branches',
      value: String(activeUsage?.branchesCount ?? 0),
      icon: 'store-outline' as const,
    },
  ];

  return (
    <MeatshopShell>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Plans & Billing</Text>
      </View>
      <View style={styles.topDivider} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <View style={styles.introTextWrap}>
            <Text style={styles.pageTitle}>Plans & Billing</Text>
            <Text style={styles.pageSubtitle}>Choose a plan that matches your store growth.</Text>
          </View>
        </View>

        <MeatshopSurfaceCard style={styles.accountCard}>
          <View style={styles.accountRow}>
            <View style={styles.accountIconTile}>
              <MaterialCommunityIcons name="storefront-outline" size={38} color="#FFFFFF" />
            </View>

            <View style={styles.accountMain}>
              <Text style={styles.accountTitle}>{activeTenant.name}</Text>

              <View style={styles.accountInfoRow}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={22}
                  color={MEATSHOP_COLORS.soft}
                />
                <Text style={styles.accountInfoLabel}>Current plan:</Text>
                <Text style={styles.accountInfoPlan}>{formatLabel(activeSubscription.planId)}</Text>
              </View>

              <View style={styles.accountInfoRow}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={22}
                  color={isHealthyStatus ? '#2F8F59' : MEATSHOP_COLORS.soft}
                />
                <Text style={styles.accountInfoLabel}>Status:</Text>
                <Text
                  style={[
                    styles.accountInfoStatus,
                    isHealthyStatus ? styles.accountInfoStatusActive : styles.accountInfoStatusMuted,
                  ]}
                >
                  {formatLabel(activeSubscription.status)}
                </Text>
              </View>

              <View style={styles.accountInfoRow}>
                <MaterialCommunityIcons
                  name="calendar-blank-outline"
                  size={22}
                  color={MEATSHOP_COLORS.maroon}
                />
                <Text style={styles.accountInfoLabel}>Billing period:</Text>
                <Text style={styles.accountInfoValue}>
                  {new Date(activeSubscription.currentPeriodStart).toLocaleDateString()} -{' '}
                  {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.accountChevronWrap}>
              <Feather name="chevron-right" size={26} color={MEATSHOP_COLORS.soft} />
            </View>
          </View>
        </MeatshopSurfaceCard>

        <MeatshopSurfaceCard style={styles.usageCard}>
          <View style={styles.usageHeader}>
            <View style={styles.usageHeaderIcon}>
              <MaterialCommunityIcons name="clock-outline" size={28} color={MEATSHOP_COLORS.maroon} />
            </View>
            <Text style={styles.usageHeaderTitle}>Usage Snapshot</Text>
          </View>

          <View style={styles.usageGrid}>
            {usageMetrics.map((metric, index) => {
              const isLeft = index % 2 === 0;
              const isTop = index < 2;

              return (
                <View
                  key={metric.key}
                  style={[
                    styles.usageCell,
                    isLeft && styles.usageCellRightBorder,
                    isTop && styles.usageCellBottomBorder,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={metric.icon}
                    size={30}
                    color={MEATSHOP_COLORS.maroon}
                  />
                  <View style={styles.usageMetricCopy}>
                    <Text style={styles.usageMetricValue}>{metric.value}</Text>
                    <Text style={styles.usageMetricLabel}>{metric.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [styles.resetButton, pressed && { opacity: 0.84 }]}
            onPress={() => {
              patchUsage(activeTenantId, {
                activeUsers: 0,
                productsCount: 0,
                monthlyTransactions: 0,
                branchesCount: 0,
              });
            }}
          >
            <Text style={styles.resetButtonText}>Reset Usage (Demo)</Text>
          </Pressable>
        </MeatshopSurfaceCard>

        <Text style={styles.sectionTitle}>Subscription Status</Text>

        <View style={styles.statusGrid}>
          {STATUS_OPTIONS.map((status) => {
            const isActiveStatus = activeSubscription.status === status;
            return (
              <Pressable
                key={status}
                style={({ pressed }) => [
                  styles.statusButton,
                  isActiveStatus && styles.statusButtonActive,
                  pressed && !isActiveStatus && { opacity: 0.82 },
                ]}
                onPress={() => setSubscriptionStatus(activeTenantId, status)}
              >
                <MaterialCommunityIcons
                  name="calendar-blank-outline"
                  size={22}
                  color={isActiveStatus ? '#FFFFFF' : MEATSHOP_COLORS.maroon}
                />
                <Text style={[styles.statusButtonText, isActiveStatus && styles.statusButtonTextActive]}>
                  {isActiveStatus ? `Current: ${status}` : `Set status: ${status}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Choose a Plan</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pricingScrollContent}
        >
          {orderedPlans.map((plan) => {
            const isCurrent = activeSubscription.planId === plan.id;
            const isPopular = plan.id === MOST_POPULAR_PLAN;
            const isHovered = hoveredPlanId === plan.id;
            const ctaLabel = getPlanCtaLabel(currentPlan, plan, isCurrent);

            return (
              <Pressable
                key={plan.id}
                accessibilityRole="button"
                accessibilityLabel={`${plan.displayName} plan`}
                accessibilityState={{ disabled: isCurrent, selected: isCurrent }}
                style={({ pressed }) => [
                  styles.planCard,
                  isPopular && styles.planCardPopular,
                  isCurrent && styles.planCardCurrent,
                  isHovered && !isCurrent && styles.planCardHovered,
                  pressed && !isCurrent && styles.planCardPressed,
                ]}
                onHoverIn={() => setHoveredPlanId(plan.id)}
                onHoverOut={() => setHoveredPlanId((currentId) => (currentId === plan.id ? null : currentId))}
                onPress={() => setTenantPlan(activeTenantId, plan.id)}
                disabled={isCurrent}
              >
                {({ pressed }) => (
                  <>
                    <View
                      style={[
                        styles.planAccent,
                        isCurrent
                          ? styles.planAccentCurrent
                          : isPopular
                            ? styles.planAccentPopular
                            : styles.planAccentDefault,
                        isHovered && !isCurrent && styles.planAccentHovered,
                      ]}
                    />

                    {isCurrent || isPopular ? (
                      <View style={styles.planStateRow}>
                        {isCurrent ? (
                          <View style={[styles.planStatePill, styles.planStatePillCurrent]}>
                            <MaterialCommunityIcons name="check-circle" size={14} color="#FFFFFF" />
                            <Text style={[styles.planStateText, styles.planStateTextCurrent]}>Current Plan</Text>
                          </View>
                        ) : null}

                        {isPopular ? (
                          <View style={[styles.planStatePill, styles.planStatePillPopular]}>
                            <Feather name="star" size={14} color={MEATSHOP_COLORS.maroonDark} />
                            <Text style={[styles.planStateText, styles.planStateTextPopular]}>Most Popular</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    <View style={styles.planHeader}>
                      <View
                        style={[
                          styles.planIconBubble,
                          (isPopular || isHovered || isCurrent) && styles.planIconBubbleHighlighted,
                          isCurrent && styles.planIconBubbleCurrent,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="food-steak"
                          size={24}
                          color={isPopular ? MEATSHOP_COLORS.gold : MEATSHOP_COLORS.maroon}
                        />
                      </View>
                      <Text style={styles.planName}>{plan.displayName}</Text>
                      <View style={styles.planPriceRow}>
                        <Text style={styles.planPrice}>{PLAN_PRICES[plan.id]}</Text>
                        <Text style={styles.planPeriod}>{getPlanPeriodLabel(plan.id)}</Text>
                      </View>
                    </View>

                    <View style={styles.featureList}>
                      <FeatureItem label="Point of Sale" enabled={plan.entitlements.featureFlags.canUsePOS} />
                      <FeatureItem
                        label="Suppliers & Customers"
                        enabled={
                          plan.entitlements.featureFlags.canManageSuppliers &&
                          plan.entitlements.featureFlags.canManageCustomers
                        }
                      />
                      <FeatureItem
                        label="Purchase Orders"
                        enabled={plan.entitlements.featureFlags.canManagePurchaseOrders}
                      />
                      <FeatureItem
                        label="Report Export"
                        enabled={plan.entitlements.featureFlags.canExportReports}
                      />
                      <FeatureItem
                        label="Offline POS"
                        enabled={plan.entitlements.featureFlags.canUseOfflineMode}
                      />
                      <FeatureItem
                        label="Advanced Analytics"
                        enabled={plan.entitlements.featureFlags.canUseAdvancedAnalytics}
                      />
                    </View>

                    <View style={[styles.limitWrap, (isHovered || isCurrent) && styles.limitWrapHighlighted]}>
                      <Text style={styles.limitText}>Users: {formatLimit(plan.entitlements.limits.maxUsers)}</Text>
                      <Text style={styles.limitText}>
                        Products: {formatLimit(plan.entitlements.limits.maxProducts)}
                      </Text>
                      <Text style={styles.limitText}>
                        Tx / month: {formatLimit(plan.entitlements.limits.maxMonthlyTransactions)}
                      </Text>
                      <Text style={styles.limitText}>
                        Branches: {formatLimit(plan.entitlements.limits.maxBranches)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.planButton,
                        isCurrent && styles.planButtonActive,
                        isHovered && !isCurrent && styles.planButtonHover,
                        pressed && !isCurrent && styles.planButtonPressed,
                      ]}
                    >
                      <Text style={[styles.planButtonText, isCurrent && styles.planButtonTextActive]}>
                        {ctaLabel}
                      </Text>
                      <Feather
                        name={isCurrent ? 'check' : 'arrow-right'}
                        size={16}
                        color={isCurrent ? '#FFFFFF' : MEATSHOP_COLORS.maroonDark}
                      />
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>

      <MeatshopBottomTabBar
        active="plans"
        onDashboard={() => router.push('/dashboard')}
        onPlans={() => router.push('/plans')}
        onInventory={() => router.push('/inventory')}
        onReports={() => router.push('/reports')}
      />
    </MeatshopShell>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 66,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  topDivider: {
    height: 1,
    backgroundColor: '#E8DDD2',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 30,
    gap: 18,
  },
  introRow: {
    marginBottom: 2,
  },
  introTextWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  pageSubtitle: {
    marginTop: 8,
    color: MEATSHOP_COLORS.muted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  accountCard: {
    padding: 20,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  accountIconTile: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: MEATSHOP_COLORS.maroonDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountMain: {
    flex: 1,
    gap: 10,
  },
  accountTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 23,
    fontWeight: '900',
  },
  accountInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  accountInfoLabel: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 14,
  },
  accountInfoPlan: {
    color: MEATSHOP_COLORS.maroon,
    fontSize: 14,
    fontWeight: '800',
  },
  accountInfoStatus: {
    fontSize: 14,
    fontWeight: '800',
  },
  accountInfoStatusActive: {
    color: '#2F8F59',
  },
  accountInfoStatusMuted: {
    color: MEATSHOP_COLORS.maroon,
  },
  accountInfoValue: {
    color: MEATSHOP_COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  accountChevronWrap: {
    alignSelf: 'center',
  },
  usageCard: {
    padding: 20,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  usageHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageHeaderTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  usageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
  },
  usageCell: {
    width: '50%',
    minHeight: 118,
    paddingHorizontal: 14,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  usageCellRightBorder: {
    borderRightWidth: 1,
    borderRightColor: '#EEE1D2',
  },
  usageCellBottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEE1D2',
  },
  usageMetricCopy: {
    flex: 1,
  },
  usageMetricValue: {
    color: MEATSHOP_COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  usageMetricLabel: {
    marginTop: 4,
    color: MEATSHOP_COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  resetButton: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: MEATSHOP_COLORS.maroon,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: MEATSHOP_COLORS.maroonDark,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
    color: MEATSHOP_COLORS.text,
    fontSize: 19,
    fontWeight: '900',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusButton: {
    width: '48.2%',
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8DDD2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...MEATSHOP_CARD_SHADOW,
  },
  statusButtonActive: {
    backgroundColor: MEATSHOP_COLORS.maroonDark,
    borderColor: MEATSHOP_COLORS.maroonDark,
  },
  statusButtonText: {
    flex: 1,
    color: '#6C6256',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },
  pricingScrollContent: {
    gap: 14,
    paddingTop: 6,
    paddingRight: 20,
    paddingBottom: 8,
  },
  planCard: {
    width: 282,
    position: 'relative',
    backgroundColor: MEATSHOP_COLORS.surface,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    borderRadius: 28,
    padding: 20,
    gap: 16,
    ...MEATSHOP_CARD_SHADOW,
  },
  planCardPopular: {
    borderColor: 'rgba(184,145,73,0.5)',
    backgroundColor: '#FFFDF8',
  },
  planCardCurrent: {
    borderWidth: 1.5,
    borderColor: MEATSHOP_COLORS.maroon,
    backgroundColor: '#FFF8F8',
  },
  planCardHovered: {
    borderColor: 'rgba(122,24,40,0.28)',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
    transform: [{ translateY: -4 }],
  },
  planCardPressed: {
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    transform: [{ translateY: -1 }],
  },
  planAccent: {
    height: 6,
    borderRadius: 999,
    marginBottom: 2,
  },
  planAccentDefault: {
    backgroundColor: '#E8DDD2',
  },
  planAccentPopular: {
    backgroundColor: MEATSHOP_COLORS.gold,
  },
  planAccentCurrent: {
    backgroundColor: MEATSHOP_COLORS.maroon,
  },
  planAccentHovered: {
    backgroundColor: '#9D5B67',
  },
  planStateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  planStatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  planStatePillCurrent: {
    backgroundColor: MEATSHOP_COLORS.maroon,
  },
  planStatePillPopular: {
    backgroundColor: '#F7E8C9',
  },
  planStateText: {
    fontSize: 11,
    fontWeight: '800',
  },
  planStateTextCurrent: {
    color: '#FFFFFF',
  },
  planStateTextPopular: {
    color: MEATSHOP_COLORS.maroonDark,
  },
  planHeader: {
    gap: 10,
    alignItems: 'center',
  },
  planIconBubble: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIconBubbleHighlighted: {
    borderColor: 'rgba(184,145,73,0.3)',
    backgroundColor: '#FFF7EA',
  },
  planIconBubbleCurrent: {
    borderColor: 'rgba(122,24,40,0.16)',
    backgroundColor: '#FCECEF',
  },
  planName: {
    color: MEATSHOP_COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  planPrice: {
    color: MEATSHOP_COLORS.maroonDark,
    fontSize: 30,
    fontWeight: '900',
  },
  planPeriod: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
  },
  featureList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    color: MEATSHOP_COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  featureTextDisabled: {
    color: MEATSHOP_COLORS.soft,
  },
  limitWrap: {
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  limitWrapHighlighted: {
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#F0DFC2',
  },
  limitText: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  planButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  planButtonActive: {
    backgroundColor: MEATSHOP_COLORS.maroon,
    borderColor: MEATSHOP_COLORS.maroon,
  },
  planButtonHover: {
    backgroundColor: '#FCECEF',
    borderColor: 'rgba(122,24,40,0.22)',
  },
  planButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  planButtonText: {
    color: MEATSHOP_COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  planButtonTextActive: {
    color: '#FFFFFF',
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  emptyTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 8,
    color: MEATSHOP_COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
  },
});
