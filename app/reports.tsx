import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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

const PRIMARY = '#7A1F1F';
const BG = '#F6F6F3';
const CARD = '#FFFFFF';
const BORDER = '#E5DED1';
const TEXT = '#1F1C17';
const MUTED = '#6A655B';

type ExportKind = 'sales' | 'inventory' | 'purchases';

export default function ReportsScreen() {
  const user = useAuthStore((state) => state.user);
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const products = useProductStore((state) => state.products);
  const setProducts = useProductStore((state) => state.setProducts);
  const summaries = useInventoryStore((state) => state.summaries);
  const setSummaries = useInventoryStore((state) => state.setSummaries);
  const sales = useSalesStore((state) => state.sales);
  const purchases = usePurchaseStore((state) => state.purchases);
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

      if (products.length > 0 && summaries.length > 0) {
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
  }, [products.length, setProducts, setSummaries, summaries.length, tenantId]);

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

  if (!canViewReports) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blockedState}>
          <Text style={styles.blockedTitle}>Access Restricted</Text>
          <Text style={styles.blockedText}>
            Your role does not allow report viewing.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!reportsEntitlement.allowed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blockedState}>
          <LockedFeatureNotice
            title="Reports Locked"
            message={reportsEntitlement.message ?? 'Upgrade your plan to access reports.'}
            requiredPlan={reportsEntitlement.requiredPlan}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Reports & Analytics</Text>
          <Text style={styles.subtitle}>
            Review sales, inventory, purchase activity, and store performance.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading report data...</Text>
          </View>
        ) : null}

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{report.grossSales.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Gross Sales</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{report.totalOrders}</Text>
            <Text style={styles.metricLabel}>Total Orders</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{report.avgTicket.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Average Ticket</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{report.totalWeightSold.toFixed(2)} kg</Text>
            <Text style={styles.metricLabel}>Weight Sold</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inventory Snapshot</Text>
          <Text style={styles.lineText}>Low stock items: {report.lowStockCount}</Text>
          <Text style={styles.lineText}>Out of stock items: {report.outOfStockCount}</Text>
          <Text style={styles.lineText}>
            Estimated inventory value: {report.inventoryValueEstimate.toFixed(2)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Purchase Summary</Text>
          <Text style={styles.lineText}>Received purchase orders: {report.receivedPurchases}</Text>
          <Text style={styles.lineText}>Open purchase orders: {report.openPurchases}</Text>
          <Text style={styles.lineText}>
            Offline sales waiting to sync: {queue.filter((item) => item.entity === 'pos_transaction').length}
          </Text>
        </View>

        <View style={styles.card}>
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
                <Text style={styles.rankAmount}>{item.revenue.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {advancedEntitlement.allowed ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Advanced Analytics</Text>
            <Text style={styles.lineText}>
              Revenue per kg: {report.totalWeightSold > 0 ? (report.grossSales / report.totalWeightSold).toFixed(2) : '0.00'}
            </Text>
            <Text style={styles.lineText}>
              Conversion signal: {report.totalOrders > 0 ? 'Sales are being captured through POS.' : 'No completed POS sales yet.'}
            </Text>
            <Text style={styles.lineText}>
              Premium tools unlocked: API, branding, SMS, and batch operations.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Advanced Analytics</Text>
            <Text style={styles.emptyText}>
              Upgrade to Premium to unlock deeper analytics, API access, custom branding, and SMS tools.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>CSV Export Preview</Text>
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

          <Pressable
            onPress={() => buildPreview(exportKind)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Generate Preview</Text>
          </Pressable>

          <TextInput
            value={exportPreview}
            editable={false}
            multiline
            style={styles.previewBox}
            placeholder="Generate a CSV preview here."
            placeholderTextColor="#8A8A8A"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
  },
  subtitle: {
    marginTop: 4,
    color: MUTED,
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: MUTED,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '47%',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: PRIMARY,
  },
  metricLabel: {
    marginTop: 4,
    color: MUTED,
    fontWeight: '600',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 8,
  },
  lineText: {
    color: TEXT,
    fontSize: 13,
    marginTop: 4,
  },
  emptyText: {
    color: MUTED,
    marginTop: 4,
  },
  rankRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rankMain: {
    flex: 1,
  },
  rankTitle: {
    fontWeight: '700',
    color: TEXT,
  },
  rankMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  rankAmount: {
    color: PRIMARY,
    fontWeight: '800',
  },
  exportRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  exportChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  exportChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  exportChipText: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 12,
  },
  exportChipTextActive: {
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewBox: {
    marginTop: 12,
    minHeight: 180,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    color: TEXT,
    textAlignVertical: 'top',
  },
  blockedState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  blockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 8,
  },
  blockedText: {
    textAlign: 'center',
    color: MUTED,
    lineHeight: 21,
  },
});
