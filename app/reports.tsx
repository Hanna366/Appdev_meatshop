import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  MEATSHOP_CARD_SHADOW,
  MEATSHOP_COLORS,
  MEATSHOP_INPUT,
  MEATSHOP_PILL,
  MeatshopBottomTabBar,
  MeatshopPageHero,
  MeatshopSectionHeader,
  MeatshopShell,
  MeatshopSurfaceCard,
} from '../src/components/ui/MeatshopChrome';
import { LockedFeatureNotice } from '../src/components/ui/LockedFeatureNotice';
import { hasPermission } from '../src/features/access/services/accessControl';
import { useAuthStore } from '../src/features/auth/store/useAuthStore';
import {
  fetchInventoryByTenantWithProducts,
  fetchInventoryFromProducts,
} from '../src/features/inventory/services/inventoryService';
import { useInventoryStore } from '../src/features/inventory/store/useInventoryStore';
import { fetchProductsByTenant } from '../src/features/product/services/productService';
import { useProductStore } from '../src/features/product/store/useProductStore';
import { fetchPurchaseOrdersByTenant } from '../src/features/purchase/services/purchaseService';
import { usePurchaseStore } from '../src/features/purchase/store/usePurchaseStore';
import {
  buildBusinessReport,
  buildInventoryCsv,
  buildPurchasesCsv,
  buildSalesCsv,
} from '../src/features/reports/services/reportService';
import { useSalesStore } from '../src/features/sales/store/useSalesStore';
import { evaluateEntitlement } from '../src/features/subscription/services/entitlementService';
import { useSubscriptionStore } from '../src/features/subscription/store/useSubscriptionStore';
import { useSyncQueueStore } from '../src/features/sync/store/useSyncQueueStore';
import { useTenantStore } from '../src/features/tenant/store/useTenantStore';

type ExportKind = 'sales' | 'inventory' | 'purchases';

function MetricCard({
  icon,
  label,
  value,
  bubbleColor,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  bubbleColor: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricBubble, { backgroundColor: bubbleColor }]}>{icon}</View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.metricValue}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const products = useProductStore((state) => state.products);
  const setProducts = useProductStore((state) => state.setProducts);
  const summaries = useInventoryStore((state) => state.summaries);
  const setSummaries = useInventoryStore((state) => state.setSummaries);
  const sales = useSalesStore((state) => state.sales);
  const purchases = usePurchaseStore((state) => state.purchases);
  const setPurchases = usePurchaseStore((state) => state.setPurchases);
  const queue = useSyncQueueStore((state) => state.queue);
  const subscriptionsByTenantId = useSubscriptionStore((state) => state.subscriptionsByTenantId);
  const usageByTenantId = useSubscriptionStore((state) => state.usageByTenantId);

  const [loading, setLoading] = useState(false);
  const [exportKind, setExportKind] = useState<ExportKind>('sales');
  const [exportPreview, setExportPreview] = useState('');

  const activeSubscription = tenantId ? subscriptionsByTenantId[tenantId] : undefined;
  const activeUsage = tenantId ? usageByTenantId[tenantId] : undefined;
  const canViewReports = hasPermission(user?.role, 'reports.view');

  const reportsEntitlement =
    activeSubscription && activeUsage
      ? evaluateEntitlement({
          subscription: activeSubscription,
          usage: activeUsage,
          feature: 'canExportReports',
        })
      : {
          allowed: false,
          reason: 'subscription_inactive' as const,
          message: 'No subscription found for this store.',
        };

  const advancedEntitlement =
    activeSubscription && activeUsage
      ? evaluateEntitlement({
          subscription: activeSubscription,
          usage: activeUsage,
          feature: 'canUseAdvancedAnalytics',
        })
      : reportsEntitlement;

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!tenantId) {
        return;
      }

      setLoading(true);
      try {
        if (products.length === 0) {
          const remoteProducts = await fetchProductsByTenant(tenantId);
          if (mounted) {
            setProducts(remoteProducts);
          }
        }

        if (summaries.length === 0) {
          let inventoryData = await fetchInventoryByTenantWithProducts(tenantId);
          if (!inventoryData || inventoryData.length === 0) {
            inventoryData = await fetchInventoryFromProducts(tenantId);
          }
          if (mounted) {
            setSummaries(inventoryData as any);
          }
        }

        const remotePurchases = await fetchPurchaseOrdersByTenant(tenantId);
        if (mounted) {
          setPurchases(remotePurchases);
        }
      } catch (error) {
        console.warn('Failed to load reporting data', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      mounted = false;
    };
  }, [products.length, setProducts, setPurchases, setSummaries, summaries.length, tenantId]);

  const scopedSales = useMemo(
    () => sales.filter((sale) => sale.tenantId === tenantId),
    [sales, tenantId],
  );
  const scopedPurchases = useMemo(
    () => purchases.filter((purchase) => purchase.tenantId === tenantId),
    [purchases, tenantId],
  );
  const report = useMemo(
    () =>
      buildBusinessReport({
        sales: scopedSales,
        purchases: scopedPurchases,
        inventorySummaries: summaries,
        products,
      }),
    [products, scopedPurchases, scopedSales, summaries],
  );

  function buildPreview(kind: ExportKind) {
    if (kind === 'sales') {
      setExportPreview(buildSalesCsv(scopedSales));
      return;
    }

    if (kind === 'inventory') {
      setExportPreview(buildInventoryCsv(summaries));
      return;
    }

    setExportPreview(buildPurchasesCsv(scopedPurchases));
  }

  return (
    <MeatshopShell>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Reports</Text>
      </View>
      <View style={styles.topDivider} />

      {!canViewReports ? (
        <View style={styles.blockedWrap}>
          <MeatshopSurfaceCard>
            <Text style={styles.blockedTitle}>Access Restricted</Text>
            <Text style={styles.blockedText}>Your role does not allow report viewing.</Text>
          </MeatshopSurfaceCard>
        </View>
      ) : !reportsEntitlement.allowed ? (
        <View style={styles.blockedWrap}>
          <MeatshopSurfaceCard>
            <LockedFeatureNotice
              title="Reports Locked"
              message={reportsEntitlement.message ?? 'Upgrade your plan to access reports.'}
              requiredPlan={reportsEntitlement.requiredPlan}
            />
          </MeatshopSurfaceCard>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <MeatshopPageHero
              eyebrow="Insights"
              title="Reports & Analytics"
              subtitle="Review sales, inventory, purchases, and performance trends in the same visual language as your dashboard."
              rightContent={
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillLabel}>Queued</Text>
                  <Text style={styles.heroPillValue}>
                    {queue.filter((item) => item.entity === 'pos_transaction').length}
                  </Text>
                </View>
              }
            >
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaPill}>
                  <MaterialCommunityIcons name="cash-register" size={16} color={MEATSHOP_COLORS.maroon} />
                  <Text style={styles.heroMetaText}>{scopedSales.length} sales records</Text>
                </View>
                <View style={styles.heroMetaPill}>
                  <MaterialCommunityIcons name="clipboard-list-outline" size={16} color={MEATSHOP_COLORS.gold} />
                  <Text style={styles.heroMetaText}>{scopedPurchases.length} purchase orders</Text>
                </View>
              </View>
            </MeatshopPageHero>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={MEATSHOP_COLORS.maroon} />
                <Text style={styles.loadingText}>Loading report data...</Text>
              </View>
            ) : null}

            <MeatshopSectionHeader
              title="Overview"
              icon={<Feather name="bar-chart-2" size={18} color={MEATSHOP_COLORS.maroon} />}
            />

            <View style={styles.metricsGrid}>
              <MetricCard
                icon={<MaterialCommunityIcons name="cash-multiple" size={28} color={MEATSHOP_COLORS.maroon} />}
                label="Gross Sales"
                value={`$${report.grossSales.toFixed(2)}`}
                bubbleColor={MEATSHOP_COLORS.roseTint}
              />
              <MetricCard
                icon={<MaterialCommunityIcons name="cart-outline" size={28} color={MEATSHOP_COLORS.gold} />}
                label="Total Orders"
                value={String(report.totalOrders)}
                bubbleColor={MEATSHOP_COLORS.sandTint}
              />
              <MetricCard
                icon={<MaterialCommunityIcons name="calculator-variant-outline" size={28} color={MEATSHOP_COLORS.gold} />}
                label="Average Ticket"
                value={`$${report.avgTicket.toFixed(2)}`}
                bubbleColor={MEATSHOP_COLORS.sandTint}
              />
              <MetricCard
                icon={<MaterialCommunityIcons name="weight-kilogram" size={28} color={MEATSHOP_COLORS.maroon} />}
                label="Weight Sold"
                value={`${report.totalWeightSold.toFixed(2)} kg`}
                bubbleColor={MEATSHOP_COLORS.roseTint}
              />
            </View>

            <MeatshopSectionHeader
              title="Business Summary"
              icon={<Feather name="layers" size={18} color={MEATSHOP_COLORS.maroon} />}
            />

            <MeatshopSurfaceCard>
              <Text style={styles.cardTitle}>Inventory Snapshot</Text>
              <Text style={styles.lineText}>Low stock items: {report.lowStockCount}</Text>
              <Text style={styles.lineText}>Out of stock items: {report.outOfStockCount}</Text>
              <Text style={styles.lineText}>
                Estimated inventory value: ${report.inventoryValueEstimate.toFixed(2)}
              </Text>
            </MeatshopSurfaceCard>

            <MeatshopSurfaceCard>
              <Text style={styles.cardTitle}>Purchase Summary</Text>
              <Text style={styles.lineText}>Received purchase orders: {report.receivedPurchases}</Text>
              <Text style={styles.lineText}>Open purchase orders: {report.openPurchases}</Text>
              <Text style={styles.lineText}>
                Offline sales waiting to sync: {queue.filter((item) => item.entity === 'pos_transaction').length}
              </Text>
            </MeatshopSurfaceCard>

            <MeatshopSurfaceCard>
              <Text style={styles.cardTitle}>Top Selling Products</Text>
              {report.topSellingProducts.length === 0 ? (
                <Text style={styles.emptyText}>No sales data yet.</Text>
              ) : (
                report.topSellingProducts.map((item) => (
                  <View key={item.productName} style={styles.rankRow}>
                    <View style={styles.rankMain}>
                      <Text style={styles.rankTitle}>{item.productName}</Text>
                      <Text style={styles.rankMeta}>{item.weightKg.toFixed(2)} kg sold</Text>
                    </View>
                    <Text style={styles.rankAmount}>${item.revenue.toFixed(2)}</Text>
                  </View>
                ))
              )}
            </MeatshopSurfaceCard>

            <MeatshopSectionHeader
              title="Advanced Analytics"
              icon={<Feather name="activity" size={18} color={MEATSHOP_COLORS.maroon} />}
            />

            <MeatshopSurfaceCard>
              {advancedEntitlement.allowed ? (
                <>
                  <Text style={styles.lineText}>
                    Revenue per kg:{' '}
                    {report.totalWeightSold > 0
                      ? `$${(report.grossSales / report.totalWeightSold).toFixed(2)}`
                      : '$0.00'}
                  </Text>
                  <Text style={styles.lineText}>
                    Conversion signal:{' '}
                    {report.totalOrders > 0
                      ? 'Sales are being captured through POS.'
                      : 'No completed POS sales yet.'}
                  </Text>
                  <Text style={styles.lineText}>
                    Premium tools unlocked: API, branding, SMS, and batch operations.
                  </Text>
                </>
              ) : (
                <Text style={styles.emptyText}>
                  Upgrade to Premium to unlock deeper analytics, API access, custom branding, and SMS tools.
                </Text>
              )}
            </MeatshopSurfaceCard>

            <MeatshopSectionHeader
              title="CSV Export Preview"
              icon={<Feather name="download" size={18} color={MEATSHOP_COLORS.maroon} />}
            />

            <MeatshopSurfaceCard>
              <View style={styles.exportRow}>
                {(['sales', 'inventory', 'purchases'] as ExportKind[]).map((kind) => {
                  const active = exportKind === kind;
                  return (
                    <Pressable
                      key={kind}
                      onPress={() => setExportKind(kind)}
                      style={[styles.exportChip, active && styles.exportChipActive]}
                    >
                      <Text style={[styles.exportChipText, active && styles.exportChipTextActive]}>
                        {kind.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable onPress={() => buildPreview(exportKind)} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Generate Preview</Text>
              </Pressable>

              <TextInput
                value={exportPreview}
                editable={false}
                multiline
                style={styles.previewBox}
                placeholder="Generate a CSV preview here."
                placeholderTextColor={MEATSHOP_COLORS.soft}
              />
            </MeatshopSurfaceCard>
          </ScrollView>

          <MeatshopBottomTabBar
            active="reports"
            onDashboard={() => router.push('/dashboard')}
            onPlans={() => router.push('/plans')}
            onInventory={() => router.push('/inventory')}
            onReports={() => router.push('/reports')}
          />
        </>
      )}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
    gap: 20,
  },
  blockedWrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  blockedTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  blockedText: {
    marginTop: 8,
    color: MEATSHOP_COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  heroPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    alignItems: 'center',
  },
  heroPillLabel: {
    color: MEATSHOP_COLORS.soft,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroPillValue: {
    marginTop: 4,
    color: MEATSHOP_COLORS.maroon,
    fontSize: 18,
    fontWeight: '900',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroMetaPill: {
    ...MEATSHOP_PILL,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMetaText: {
    color: MEATSHOP_COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  loadingText: {
    color: MEATSHOP_COLORS.muted,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 154,
    backgroundColor: MEATSHOP_COLORS.surface,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    ...MEATSHOP_CARD_SHADOW,
  },
  metricBubble: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: MEATSHOP_COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  metricLabel: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  cardTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  lineText: {
    color: MEATSHOP_COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  emptyText: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 4,
  },
  rankRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE1D2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rankMain: {
    flex: 1,
  },
  rankTitle: {
    color: MEATSHOP_COLORS.text,
    fontWeight: '800',
    fontSize: 15,
  },
  rankMeta: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  rankAmount: {
    color: MEATSHOP_COLORS.maroon,
    fontWeight: '900',
    fontSize: 15,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  exportChip: {
    ...MEATSHOP_PILL,
  },
  exportChipActive: {
    backgroundColor: MEATSHOP_COLORS.maroon,
    borderColor: MEATSHOP_COLORS.maroon,
  },
  exportChipText: {
    color: MEATSHOP_COLORS.text,
    fontWeight: '800',
    fontSize: 12,
  },
  exportChipTextActive: {
    color: '#FFFFFF',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: MEATSHOP_COLORS.maroonDark,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  previewBox: {
    ...MEATSHOP_INPUT,
    marginTop: 14,
    minHeight: 220,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
});
