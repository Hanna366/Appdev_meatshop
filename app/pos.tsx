import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { fetchContactsByTenant } from '../src/features/contact/services/contactService';
import { useContactStore } from '../src/features/contact/store/useContactStore';
import { createStockOut } from '../src/features/inventory/services/inventoryService';
import { useInventoryStore } from '../src/features/inventory/store/useInventoryStore';
import { fetchProductsByTenant } from '../src/features/product/services/productService';
import { useProductStore } from '../src/features/product/store/useProductStore';
import { useSalesStore } from '../src/features/sales/store/useSalesStore';
import type { SalePaymentMethod, SaleRecord } from '../src/features/sales/types/salesTypes';
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

const PAYMENT_METHODS: SalePaymentMethod[] = ['cash', 'gcash', 'card'];

export default function PosScreen() {
  const user = useAuthStore((state) => state.user);
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const products = useProductStore((state) => state.products);
  const setProducts = useProductStore((state) => state.setProducts);
  const contacts = useContactStore((state) => state.contacts);
  const setContacts = useContactStore((state) => state.setContacts);
  const sales = useSalesStore((state) => state.sales);
  const upsertSale = useSalesStore((state) => state.upsertSale);
  const summaries = useInventoryStore((state) => state.summaries);
  const setSummaries = useInventoryStore((state) => state.setSummaries);
  const queue = useSyncQueueStore((state) => state.queue);
  const enqueue = useSyncQueueStore((state) => state.enqueue);
  const setQueue = useSyncQueueStore((state) => state.setQueue);
  const subscriptionsByTenantId = useSubscriptionStore((state) => state.subscriptionsByTenantId);
  const usageByTenantId = useSubscriptionStore((state) => state.usageByTenantId);
  const incrementUsage = useSubscriptionStore((state) => state.incrementUsage);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [weightKg, setWeightKg] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('cash');
  const [offlineMode, setOfflineMode] = useState(false);

  const activeSubscription = tenantId ? subscriptionsByTenantId[tenantId] : undefined;
  const activeUsage = tenantId ? usageByTenantId[tenantId] : undefined;

  const canCheckout = hasPermission(user?.role, 'pos.checkout');
  const posEntitlement =
    activeSubscription && activeUsage
      ? evaluateEntitlement({
          subscription: activeSubscription,
          usage: activeUsage,
          feature: 'canUsePOS',
        })
      : {
          allowed: false,
          reason: 'subscription_inactive' as const,
          message: 'No subscription found for this store.',
        };

  const offlineEntitlement =
    activeSubscription && activeUsage
      ? evaluateEntitlement({
          subscription: activeSubscription,
          usage: activeUsage,
          feature: 'canUseOfflineMode',
        })
      : posEntitlement;

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      if (!tenantId || products.length > 0) {
        return;
      }

      setLoadingProducts(true);
      try {
        const remoteProducts = await fetchProductsByTenant(tenantId);
        if (!mounted) {
          return;
        }
        setProducts(remoteProducts);
      } catch (error) {
        console.warn('Failed to load products for POS', error);
      } finally {
        if (mounted) {
          setLoadingProducts(false);
        }
      }
    }

    void loadProducts();
    return () => {
      mounted = false;
    };
  }, [products.length, setProducts, tenantId]);

  useEffect(() => {
    let mounted = true;

    async function loadContacts() {
      if (!tenantId) {
        return;
      }

      try {
        const remoteContacts = await fetchContactsByTenant(tenantId);
        if (!mounted) {
          return;
        }
        setContacts(remoteContacts);
      } catch (error) {
        console.warn('Failed to load contacts for POS', error);
      }
    }

    void loadContacts();
    return () => {
      mounted = false;
    };
  }, [setContacts, tenantId]);

  const customers = useMemo(
    () => contacts.filter((contact) => contact.tenantId === tenantId && contact.kind === 'customer'),
    [contacts, tenantId],
  );
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );
  const recentSales = useMemo(
    () => sales.filter((sale) => sale.tenantId === tenantId).slice(0, 8),
    [sales, tenantId],
  );
  const queuedSales = useMemo(
    () => queue.filter((item) => item.entity === 'pos_transaction' && item.operation === 'create'),
    [queue],
  );

  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(String(selectedProduct.price));
    }
  }, [selectedProduct]);

  function applyLocalStockReduction(productId: string, quantity: number) {
    setProducts(
      products.map((product) =>
        product.id === productId
          ? { ...product, stock: Math.max(0, Number(product.stock ?? 0) - quantity) }
          : product,
      ),
    );

    if (summaries.length > 0) {
      setSummaries(
        summaries.map((summary) =>
          summary.productId === productId
            ? {
                ...summary,
                totalQuantity: Math.max(0, Number(summary.totalQuantity ?? 0) - quantity),
              }
            : summary,
        ),
      );
    }
  }

  function resetForm() {
    setSelectedProductId('');
    setSelectedCustomerId('');
    setWeightKg('');
    setUnitPrice('');
    setPaymentMethod('cash');
    setOfflineMode(false);
  }

  function buildSaleRecord(mode: 'online' | 'offline'): SaleRecord | null {
    if (!tenantId) {
      Alert.alert('No store selected', 'Please sign in to a store before checking out.');
      return null;
    }

    if (!selectedProduct) {
      Alert.alert('Product required', 'Choose a product to sell.');
      return null;
    }

    const parsedWeight = Number(weightKg);
    const parsedPrice = Number(unitPrice);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Invalid weight', 'Weight must be greater than 0.');
      return null;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Invalid price', 'Unit price must be a valid number.');
      return null;
    }

    if (selectedProduct.stock !== undefined && parsedWeight > Number(selectedProduct.stock ?? 0)) {
      Alert.alert('Insufficient stock', 'The requested weight is greater than current stock.');
      return null;
    }

    const saleId = `sale_${Date.now()}`;
    const lineTotal = parsedWeight * parsedPrice;
    return {
      id: saleId,
      tenantId,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name ?? 'Walk-in',
      paymentMethod,
      status: mode === 'offline' ? 'queued_offline' : 'completed',
      mode,
      subtotal: lineTotal,
      totalWeightKg: parsedWeight,
      lines: [
        {
          id: `${saleId}_line_1`,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          weightKg: parsedWeight,
          unitPrice: parsedPrice,
          lineTotal,
        },
      ],
      createdAt: new Date().toISOString(),
      syncedAt: mode === 'online' ? new Date().toISOString() : undefined,
    };
  }

  async function checkout(mode: 'online' | 'offline') {
    const sale = buildSaleRecord(mode);
    if (!sale) {
      return;
    }

    if (mode === 'offline' && !offlineEntitlement.allowed) {
      Alert.alert(
        'Offline mode locked',
        offlineEntitlement.message ?? 'Upgrade your plan to use offline POS mode.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const line = sale.lines[0];
      if (mode === 'online') {
        await createStockOut(tenantId as string, line.productId, line.weightKg, user?.id);
      } else {
        enqueue({
          id: `sync_${sale.id}`,
          tenantId: tenantId as string,
          entity: 'pos_transaction',
          operation: 'create',
          payload: {
            saleId: sale.id,
            serializedSale: JSON.stringify(sale),
          },
          queuedAt: new Date().toISOString(),
        });
      }

      upsertSale(sale);
      applyLocalStockReduction(line.productId, line.weightKg);
      if (tenantId) {
        incrementUsage(tenantId, 'monthlyTransactions', 1);
      }
      resetForm();
      Alert.alert(
        mode === 'online' ? 'Sale recorded' : 'Queued offline',
        `${line.productName} checkout total: ${sale.subtotal.toFixed(2)}`,
      );
    } catch (error: any) {
      Alert.alert('Checkout failed', String(error?.message ?? error));
    } finally {
      setSubmitting(false);
    }
  }

  async function syncQueuedSales() {
    const items = [...queuedSales];
    if (!tenantId || items.length === 0) {
      return;
    }

    setSyncing(true);
    let syncedCount = 0;
    const processedIds: string[] = [];

    try {
      for (const item of items) {
        const serializedSale = String(item.payload.serializedSale ?? '');
        const sale = JSON.parse(serializedSale) as SaleRecord;
        const line = sale.lines[0];
        await createStockOut(tenantId, line.productId, line.weightKg, user?.id);
        upsertSale({
          ...sale,
          status: 'completed',
          mode: 'online',
          syncedAt: new Date().toISOString(),
        });
        processedIds.push(item.id);
        syncedCount += 1;
      }

      setQueue(queue.filter((item) => !processedIds.includes(item.id)));
      Alert.alert('Sync complete', `${syncedCount} queued sale(s) synced successfully.`);
    } catch (error: any) {
      Alert.alert('Sync interrupted', String(error?.message ?? error));
    } finally {
      setSyncing(false);
    }
  }

  if (!canCheckout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blockedState}>
          <Text style={styles.blockedTitle}>Access Restricted</Text>
          <Text style={styles.blockedText}>
            Your role does not allow POS checkout actions.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!posEntitlement.allowed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blockedState}>
          <LockedFeatureNotice
            title="POS Locked"
            message={posEntitlement.message ?? 'Upgrade your plan to use the checkout screen.'}
            requiredPlan={posEntitlement.requiredPlan}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Weight-Based POS</Text>
          <Text style={styles.subtitle}>
            Process meat sales by weight and keep inventory synced automatically.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Checkout Form</Text>

          <Text style={styles.label}>Select Product</Text>
          {loadingProducts ? <ActivityIndicator style={{ marginVertical: 8 }} /> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {products.map((product) => {
              const active = selectedProductId === product.id;
              return (
                <Pressable
                  key={product.id}
                  onPress={() => setSelectedProductId(product.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {product.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.rowField}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                value={weightKg}
                onChangeText={setWeightKg}
                style={styles.input}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#8A8A8A"
              />
            </View>
            <View style={styles.rowField}>
              <Text style={styles.label}>Unit Price</Text>
              <TextInput
                value={unitPrice}
                onChangeText={setUnitPrice}
                style={styles.input}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#8A8A8A"
              />
            </View>
          </View>

          <Text style={styles.label}>Customer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              onPress={() => setSelectedCustomerId('')}
              style={[styles.chip, selectedCustomerId === '' && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedCustomerId === '' && styles.chipTextActive]}>
                Walk-in
              </Text>
            </Pressable>
            {customers.map((customer) => {
              const active = selectedCustomerId === customer.id;
              return (
                <Pressable
                  key={customer.id}
                  onPress={() => setSelectedCustomerId(customer.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {customer.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_METHODS.map((method) => {
              const active = paymentMethod === method;
              return (
                <Pressable
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={[styles.paymentButton, active && styles.paymentButtonActive]}
                >
                  <Text style={[styles.paymentButtonText, active && styles.paymentButtonTextActive]}>
                    {method.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => {
              if (!offlineEntitlement.allowed) {
                Alert.alert(
                  'Offline mode locked',
                  offlineEntitlement.message ?? 'Upgrade your plan to use offline checkout.',
                );
                return;
              }
              setOfflineMode((current) => !current);
            }}
            style={[styles.offlineToggle, offlineMode && styles.offlineToggleActive]}
          >
            <Text style={[styles.offlineToggleText, offlineMode && styles.offlineToggleTextActive]}>
              {offlineMode ? 'Offline mode enabled' : 'Use offline mode for this sale'}
            </Text>
          </Pressable>

          {selectedProduct ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>Product: {selectedProduct.name}</Text>
              <Text style={styles.summaryText}>Available stock: {Number(selectedProduct.stock ?? 0).toFixed(2)} kg</Text>
              <Text style={styles.summaryText}>
                Checkout total:{' '}
                {(
                  (Number(weightKg) || 0) * (Number(unitPrice) || Number(selectedProduct.price ?? 0))
                ).toFixed(2)}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => {
                void checkout(offlineMode ? 'offline' : 'online');
              }}
              disabled={submitting}
              style={[styles.primaryButton, submitting && styles.disabledButton]}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Processing...' : offlineMode ? 'Queue Sale' : 'Complete Sale'}
              </Text>
            </Pressable>
            <Pressable onPress={resetForm} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Offline Queue</Text>
            <Pressable
              onPress={() => {
                void syncQueuedSales();
              }}
              disabled={queuedSales.length === 0 || syncing}
              style={[
                styles.smallButton,
                (queuedSales.length === 0 || syncing) && styles.disabledButton,
              ]}
            >
              <Text style={styles.smallButtonText}>{syncing ? 'Syncing...' : 'Sync Queued Sales'}</Text>
            </Pressable>
          </View>
          <Text style={styles.emptyText}>Queued offline sales: {queuedSales.length}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Sales</Text>
          {recentSales.length === 0 ? (
            <Text style={styles.emptyText}>No sales recorded yet.</Text>
          ) : (
            recentSales.map((sale) => (
              <View key={sale.id} style={styles.saleRow}>
                <View style={styles.saleRowMain}>
                  <Text style={styles.saleTitle}>{sale.lines[0]?.productName ?? 'Item'}</Text>
                  <Text style={styles.saleMeta}>
                    {sale.totalWeightKg.toFixed(2)} kg | {sale.paymentMethod.toUpperCase()} |{' '}
                    {sale.customerName ?? 'Walk-in'}
                  </Text>
                  <Text style={styles.saleMeta}>
                    {sale.mode === 'offline' ? 'Queued offline' : 'Synced'} |{' '}
                    {new Date(sale.createdAt).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.saleAmount}>{sale.subtotal.toFixed(2)}</Text>
              </View>
            ))
          )}
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
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  label: {
    fontWeight: '700',
    color: TEXT,
    marginTop: 10,
    marginBottom: 6,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  chipText: {
    color: TEXT,
    fontWeight: '600',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowField: {
    flex: 1,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: TEXT,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  paymentButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  paymentButtonActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  paymentButtonText: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 12,
  },
  paymentButtonTextActive: {
    color: '#FFFFFF',
  },
  offlineToggle: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  offlineToggleActive: {
    backgroundColor: '#FFF1EC',
    borderColor: '#F2D2C6',
  },
  offlineToggleText: {
    color: TEXT,
    fontWeight: '600',
  },
  offlineToggleTextActive: {
    color: '#A23821',
  },
  summaryBox: {
    marginTop: 12,
    backgroundColor: '#FAF6F0',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 4,
  },
  summaryText: {
    color: TEXT,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: TEXT,
    fontWeight: '700',
  },
  smallButton: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.55,
  },
  emptyText: {
    color: MUTED,
    marginTop: 6,
  },
  saleRow: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  saleRowMain: {
    flex: 1,
  },
  saleTitle: {
    fontWeight: '700',
    color: TEXT,
  },
  saleMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  saleAmount: {
    color: PRIMARY,
    fontWeight: '800',
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
