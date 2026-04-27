import { useMemo } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PLAN_CATALOG } from '../src/features/subscription/config/planCatalog';
import { useSubscriptionStore } from '../src/features/subscription/store/useSubscriptionStore';
import type {
  PlanDefinition,
  PlanId,
  SubscriptionStatus,
} from '../src/features/subscription/types/subscriptionTypes';
import { useTenantStore } from '../src/features/tenant/store/useTenantStore';

const MAROON = '#6B1A2A';
const MAROON_DARK = '#5A1220';
const CREAM = '#F2EDE4';
const CARD = '#FFFFFF';
const BORDER = '#E8DDD2';
const TEXT_DARK = '#1A1411';
const TEXT_MID = '#7A7061';
const TEXT_LIGHT = '#9A8A78';

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

function FeatureItem({ label, enabled }: { label: string; enabled: boolean }) {
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
  if (isCurrent) return 'Current Plan';
  if (targetPlan.rank > currentPlan.rank) return `Upgrade to ${targetPlan.displayName}`;
  return `Switch to ${targetPlan.displayName}`;
}

function formatLimit(value: number | null): string {
  return value === null ? 'Unlimited' : String(value);
}

// ── Bottom Tab Bar ────────────────────────────────────────────────────────────
function BottomTabBar({ onDashboard, onInventory, onReports }: { onDashboard: () => void; onInventory: () => void; onReports: () => void; }) {
  return (
    <View style={tabStyles.tabBar}>
      <Pressable style={tabStyles.tab} onPress={onDashboard}>
        <Text style={tabStyles.tabIcon}>⌂</Text>
        <Text style={tabStyles.tabLabel}>Dashboard</Text>
      </Pressable>
      <View style={[tabStyles.tab, tabStyles.tabActive]}>
        <Text style={tabStyles.tabIconActive}>📋</Text>
        <Text style={tabStyles.tabLabelActive}>Plans</Text>
      </View>
      <Pressable style={tabStyles.tab} onPress={onInventory}>
        <Text style={tabStyles.tabIcon}>🥩</Text>
        <Text style={tabStyles.tabLabel}>Inventory</Text>
      </Pressable>
      <Pressable style={tabStyles.tab} onPress={onReports}>
        <Text style={tabStyles.tabIcon}>📊</Text>
        <Text style={tabStyles.tabLabel}>Reports</Text>
      </Pressable>
    </View>
  );
}

export default function PlansScreen() {
  const router = useRouter();
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
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Plans & Billing</Text>
          <Text style={styles.emptyText}>No active tenant or subscription found. Select a tenant before managing plans.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPlan = PLAN_CATALOG[activeSubscription.planId];

  return (
    <SafeAreaView style={styles.screen}>
      {/* Top Header */}
      <View style={headerStyles.header}>
        <Pressable style={headerStyles.headerBtn} onPress={() => router.back()}>
          <Text style={headerStyles.hamburger}>←</Text>
        </Pressable>

        <View style={headerStyles.headerLogoBlock}>
          <Text style={headerStyles.headerTitle}>Plans & Billing</Text>
        </View>

        <View style={headerStyles.headerRightSpacer} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {/* Title Area */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Image source={require('../assets/logo.png')} style={styles.pageHeaderLogo} resizeMode="contain" />
          </View>
          <View style={styles.pageHeaderTextWrap}>
            <Text style={styles.pageTitle}>Plans & Billing</Text>
            <Text style={styles.pageSubtitle}>Choose a plan that matches your store growth.</Text>
          </View>
        </View>

        {/* Top Cards Row */}
        <View style={styles.topCardsRow}>
          {/* Account Card */}
          <View style={styles.accountCard}>
            <View style={styles.accountIconWrap}>
              <Text style={styles.accountIconText}>🏪</Text>
            </View>
            <View>
              <Text style={styles.accountName}>{activeTenant.name}</Text>
              <Text style={styles.accountMeta}>Current plan: <Text style={{fontWeight: '700'}}>{activeSubscription.planId.charAt(0).toUpperCase() + activeSubscription.planId.slice(1)}</Text></Text>
              <Text style={styles.accountMeta}>Status: <Text style={{color: '#2A8A52', fontWeight: '700'}}>{activeSubscription.status.charAt(0).toUpperCase() + activeSubscription.status.slice(1)}</Text></Text>
              <Text style={[styles.accountMeta, { marginTop: 4 }]}>
                Billing period: {new Date(activeSubscription.currentPeriodStart).toLocaleDateString()} - {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Usage Snapshot Card */}
          <View style={styles.usageCard}>
            <View style={styles.usageHeaderRow}>
              <Text style={styles.usageHeaderIcon}>🕒</Text>
              <Text style={styles.usageHeaderTitle}>Usage Snapshot</Text>
            </View>
            <Text style={styles.usageText}>Users: {activeUsage?.activeUsers ?? 0}</Text>
            <Text style={styles.usageText}>Products: {activeUsage?.productsCount ?? 0}</Text>
            <Text style={styles.usageText}>Monthly transactions: {activeUsage?.monthlyTransactions ?? 0}</Text>
            <Text style={styles.usageText}>Branches: {activeUsage?.branchesCount ?? 0}</Text>
            
            <Pressable
              style={styles.resetBtn}
              onPress={() => {
                patchUsage(activeTenantId, { activeUsers: 0, productsCount: 0, monthlyTransactions: 0, branchesCount: 0 });
              }}
            >
              <Text style={styles.resetBtnText}>Reset Usage (Demo)</Text>
            </Pressable>
          </View>
        </View>

        {/* Subscription Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Subscription Status</Text>
          <View style={styles.statusPillsRow}>
            {STATUS_OPTIONS.map((status) => {
              const isActiveStatus = activeSubscription.status === status;
              return (
                <Pressable
                  key={status}
                  style={[styles.statusPill, isActiveStatus && styles.statusPillActive]}
                  onPress={() => setSubscriptionStatus(activeTenantId, status)}
                >
                  <Text style={[styles.statusPillText, isActiveStatus && styles.statusPillTextActive]}>
                    {isActiveStatus ? `Current: ${status}` : `Set status: ${status}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pricingScrollContent}>
            {orderedPlans.map((plan) => {
              const isCurrent = activeSubscription.planId === plan.id;
              const isPopular = plan.id === MOST_POPULAR_PLAN;
              const ctaLabel = getPlanCtaLabel(currentPlan, plan, isCurrent);

              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    isPopular && styles.popularPlanCard,
                  ]}
                >
                  {isPopular ? (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Most Popular</Text>
                    </View>
                  ) : null}

                  <View style={styles.planIconWrap}>
                    <Text style={styles.planIcon}>🥩</Text>
                  </View>
                  <Text style={styles.planName}>{plan.displayName}</Text>
                  
                  <View style={styles.priceWrap}>
                    <Text style={styles.priceText}>₱{PLAN_PRICES[plan.id].toLocaleString()}</Text>
                    <Text style={styles.pricePeriod}>/month</Text>
                  </View>

                  <View style={styles.featureList}>
                    <FeatureItem label="Point of Sale" enabled={plan.entitlements.featureFlags.canUsePOS} />
                    <FeatureItem label="Export Reports" enabled={plan.entitlements.featureFlags.canExportReports} />
                    <FeatureItem label="Offline Mode" enabled={plan.entitlements.featureFlags.canUseOfflineMode} />
                    <FeatureItem label="Multi-branch" enabled={plan.entitlements.featureFlags.canUseMultiBranch} />
                  </View>

                  <View style={styles.limitWrap}>
                    <Text style={styles.limitText}>Users: {formatLimit(plan.entitlements.limits.maxUsers)}</Text>
                    <Text style={styles.limitText}>Products: {formatLimit(plan.entitlements.limits.maxProducts)}</Text>
                    <Text style={styles.limitText}>Tx/month: {formatLimit(plan.entitlements.limits.maxMonthlyTransactions)}</Text>
                    <Text style={styles.limitText}>Branches: {formatLimit(plan.entitlements.limits.maxBranches)}</Text>
                  </View>

                  <Pressable
                    style={({pressed}) => [
                      styles.planCtaBtn,
                      isCurrent && styles.planCtaBtnActive,
                      pressed && !isCurrent && { opacity: 0.8 }
                    ]}
                    onPress={() => setTenantPlan(activeTenantId, plan.id)}
                    disabled={isCurrent}
                  >
                    <Text style={[styles.planCtaBtnText, isCurrent && styles.planCtaBtnTextActive]}>
                      {ctaLabel}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>

      </ScrollView>

      <BottomTabBar
        onDashboard={() => router.push('/dashboard')}
        onInventory={() => router.push('/inventory')}
        onReports={() => {}}
      />
    </SafeAreaView>
  );
}

const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CREAM,
  },
  headerBtn: { padding: 6 },
  hamburger: { fontSize: 24, color: MAROON, fontWeight: '600' },
  headerLogoBlock: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: MAROON_DARK },
  headerRightSpacer: { width: 36 },
});

const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: MAROON,
    paddingBottom: 8,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabActive: { borderTopWidth: 2, borderTopColor: '#FFFFFF', paddingTop: 4 },
  tabIcon: { fontSize: 20, color: 'rgba(255,255,255,0.55)' },
  tabIconActive: { fontSize: 20, color: '#FFFFFF' },
  tabLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  tabLabelActive: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
    gap: 20,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageHeaderLeft: {
    width: 60,
  },
  pageHeaderLogo: {
    width: 100,
    height: 45,
    marginLeft: -20, // To pull it to the left slightly
  },
  pageHeaderTextWrap: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F1A14',
    letterSpacing: 0.2,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6E6456',
  },
  
  // Top Cards Row (Stack vertically on small devices)
  topCardsRow: {
    gap: 12,
  },
  accountCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  accountIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountIconText: { fontSize: 20 },
  accountName: { fontSize: 16, fontWeight: '800', color: '#2D2720', marginBottom: 4 },
  accountMeta: { fontSize: 12, color: '#655D51', marginBottom: 2 },
  
  usageCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 4,
  },
  usageHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  usageHeaderIcon: { fontSize: 16, color: MAROON },
  usageHeaderTitle: { fontSize: 15, fontWeight: '700', color: MAROON_DARK },
  usageText: { color: '#5D5548', fontSize: 12 },
  resetBtn: {
    backgroundColor: '#EBE2D5',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  resetBtnText: { color: '#5A5144', fontSize: 12, fontWeight: '700' },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: MAROON_DARK,
    marginBottom: 10,
  },

  // Subscription Status
  statusSection: {},
  statusPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    backgroundColor: '#F3ECE1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E8DED0',
  },
  statusPillActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6456',
  },
  statusPillTextActive: {
    color: '#FFFFFF',
  },

  // Pricing
  pricingSection: {},
  pricingScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  planCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    width: 220,
    gap: 10,
    shadowColor: '#2A231B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    position: 'relative',
  },
  popularPlanCard: {
    borderColor: '#A53C21',
    borderWidth: 1.5,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#6B1A2A',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  planIconWrap: { alignItems: 'center', marginBottom: 4, marginTop: 8 },
  planIcon: { fontSize: 24 },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A241D',
    textAlign: 'center',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    marginBottom: 8,
  },
  priceText: {
    fontSize: 28,
    fontWeight: '800',
    color: MAROON_DARK,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontSize: 12,
    color: '#6E6457',
    marginBottom: 5,
  },
  featureList: { gap: 6, marginBottom: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: { width: 18, fontSize: 13, fontWeight: '700' },
  featureIconEnabled: { color: '#2A8A52' },
  featureIconDisabled: { color: MAROON },
  featureText: { color: '#3A3228', fontSize: 12, fontWeight: '600' },
  featureTextDisabled: { color: '#8B8072' },
  limitWrap: {
    backgroundColor: '#F8F3EA',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginBottom: 10,
  },
  limitText: { color: '#6A5E4E', fontSize: 11, fontWeight: '600' },
  planCtaBtn: {
    backgroundColor: '#F3ECE1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DED0',
  },
  planCtaBtnActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  planCtaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A4136',
  },
  planCtaBtnTextActive: {
    color: '#FFFFFF',
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: MAROON_DARK, marginBottom: 8 },
  emptyText: { color: TEXT_MID, textAlign: 'center' },
});
