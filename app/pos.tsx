import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  MEATSHOP_CARD_SHADOW,
  MEATSHOP_COLORS,
  MEATSHOP_INPUT,
  MEATSHOP_PILL,
  MeatshopHeaderIconButton,
  MeatshopPageHeader,
  MeatshopPageHero,
  MeatshopSectionHeader,
  MeatshopShell,
  MeatshopSurfaceCard,
} from '../src/components/ui/MeatshopChrome';
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

const PAYMENT_METHODS: SalePaymentMethod[] = ['cash', 'gcash', 'card'];

export default function PosScreen() {
  const router = useRouter();
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
        await createStockOut(tenantId as string, line.productId, line.weightKg, user?.id, sale.id, sale);
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
        const syncedSale = {
          ...sale,
          status: 'completed',
          mode: 'online',
          syncedAt: new Date().toISOString(),
        } as SaleRecord;
        await createStockOut(tenantId, line.productId, line.weightKg, user?.id, sale.id, syncedSale);
        upsertSale(syncedSale);
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

  const blockedBody = !canCheckout ? (
    <MeatshopSurfaceCard>
      <Text style={styles.blockedTitle}>Access Restricted</Text>
      <Text style={styles.blockedText}>Your role does not allow POS checkout actions.</Text>
    </MeatshopSurfaceCard>
  ) : !posEntitlement.allowed ? (
    <MeatshopSurfaceCard>
      <LockedFeatureNotice
        title="POS Locked"
        message={posEntitlement.message ?? 'Upgrade your plan to use the checkout screen.'}
        requiredPlan={posEntitlement.requiredPlan}
      />
    </MeatshopSurfaceCard>
  ) : null;

  return (
    <MeatshopShell>
      <MeatshopPageHeader
        leftAction={{
          onPress: () => router.back(),
          children: <Feather name="chevron-left" size={28} color={MEATSHOP_COLORS.maroon} />,
        }}
        rightActions={
          <MeatshopHeaderIconButton
            icon={<MaterialCommunityIcons name="view-grid-outline" size={26} color={MEATSHOP_COLORS.maroon} />}
            onPress={() => router.push('/dashboard')}
          />
        }
      />

      {blockedBody ? (
        <View style={styles.blockedWrap}>{blockedBody}</View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <MeatshopPageHero
            eyebrow="Checkout"
            title="Weight-Based POS"
            subtitle="Process meat sales by weight, keep inventory synced, and manage offline queueing from the same refined workspace."
            rightContent={
              <View style={styles.heroPill}>
                <Text style={styles.heroPillLabel}>Offline Queue</Text>
                <Text style={styles.heroPillValue}>{queuedSales.length}</Text>
              </View>
            }
          >
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaPill}>
                <MaterialCommunityIcons name="food-steak" size={16} color={MEATSHOP_COLORS.maroon} />
                <Text style={styles.heroMetaText}>{products.length} products loaded</Text>
              </View>
              <View style={styles.heroMetaPill}>
                <MaterialCommunityIcons name="account-outline" size={16} color={MEATSHOP_COLORS.gold} />
                <Text style={styles.heroMetaText}>{customers.length} customers available</Text>
              </View>
            </View>
          </MeatshopPageHero>

          <MeatshopSectionHeader
            title="Checkout Form"
            icon={<Feather name="shopping-cart" size={18} color={MEATSHOP_COLORS.maroon} />}
          />

          <MeatshopSurfaceCard>
            <Text style={styles.label}>Select Product</Text>
            {loadingProducts ? <ActivityIndicator style={{ marginVertical: 8 }} color={MEATSHOP_COLORS.maroon} /> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {products.map((product) => {
                const active = selectedProductId === product.id;
                return (
                  <Pressable
                    key={product.id}
                    onPress={() => setSelectedProductId(product.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{product.name}</Text>
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
                  placeholderTextColor={MEATSHOP_COLORS.soft}
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
                  placeholderTextColor={MEATSHOP_COLORS.soft}
                />
              </View>
            </View>

            <Text style={styles.label}>Customer</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable
                onPress={() => setSelectedCustomerId('')}
                style={[styles.chip, selectedCustomerId === '' && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedCustomerId === '' && styles.chipTextActive]}>Walk-in</Text>
              </Pressable>
              {customers.map((customer) => {
                const active = selectedCustomerId === customer.id;
                return (
                  <Pressable
                    key={customer.id}
                    onPress={() => setSelectedCustomerId(customer.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{customer.name}</Text>
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
                <Text style={styles.summaryText}>
                  Available stock: {Number(selectedProduct.stock ?? 0).toFixed(2)} kg
                </Text>
                <Text style={styles.summaryText}>
                  Customer: {selectedCustomer?.name ?? 'Walk-in'}
                </Text>
                <Text style={styles.summaryText}>
                  Checkout total: $
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
          </MeatshopSurfaceCard>

          <MeatshopSectionHeader
            title="Queue & Recent Sales"
            icon={<Feather name="clock" size={18} color={MEATSHOP_COLORS.maroon} />}
          />

          <MeatshopSurfaceCard>
            <View style={styles.queueHeader}>
              <Text style={styles.cardTitle}>Offline Queue</Text>
              <Pressable
                onPress={() => {
                  void syncQueuedSales();
                }}
                disabled={queuedSales.length === 0 || syncing}
                style={[styles.smallButton, (queuedSales.length === 0 || syncing) && styles.disabledButton]}
              >
                <Text style={styles.smallButtonText}>{syncing ? 'Syncing...' : 'Sync Queued Sales'}</Text>
              </Pressable>
            </View>
            <Text style={styles.emptyText}>Queued offline sales: {queuedSales.length}</Text>
          </MeatshopSurfaceCard>

          <MeatshopSurfaceCard>
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
                  <Text style={styles.saleAmount}>${sale.subtotal.toFixed(2)}</Text>
                </View>
              ))
            )}
          </MeatshopSurfaceCard>
        </ScrollView>
      )}
    </MeatshopShell>
  );
}

const styles = StyleSheet.create({
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
  cardTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    fontWeight: '800',
    color: MEATSHOP_COLORS.text,
    marginTop: 12,
    marginBottom: 8,
    fontSize: 14,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    ...MEATSHOP_PILL,
  },
  chipActive: {
    backgroundColor: MEATSHOP_COLORS.maroon,
    borderColor: MEATSHOP_COLORS.maroon,
  },
  chipText: {
    color: MEATSHOP_COLORS.text,
    fontWeight: '700',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowField: {
    flex: 1,
  },
  input: {
    ...MEATSHOP_INPUT,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  paymentButton: {
    ...MEATSHOP_PILL,
    borderRadius: 16,
    paddingVertical: 10,
  },
  paymentButtonActive: {
    backgroundColor: MEATSHOP_COLORS.maroon,
    borderColor: MEATSHOP_COLORS.maroon,
  },
  paymentButtonText: {
    color: MEATSHOP_COLORS.text,
    fontWeight: '800',
    fontSize: 12,
  },
  paymentButtonTextActive: {
    color: '#FFFFFF',
  },
  offlineToggle: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  offlineToggleActive: {
    backgroundColor: MEATSHOP_COLORS.dangerBg,
    borderColor: MEATSHOP_COLORS.dangerBorder,
  },
  offlineToggleText: {
    color: MEATSHOP_COLORS.text,
    fontWeight: '700',
  },
  offlineToggleTextActive: {
    color: MEATSHOP_COLORS.dangerText,
  },
  summaryBox: {
    marginTop: 14,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    gap: 5,
  },
  summaryText: {
    color: MEATSHOP_COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: MEATSHOP_COLORS.maroonDark,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
  },
  secondaryButtonText: {
    color: MEATSHOP_COLORS.text,
    fontWeight: '800',
    fontSize: 14,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  smallButton: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: MEATSHOP_COLORS.maroonDark,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.55,
  },
  emptyText: {
    color: MEATSHOP_COLORS.muted,
    marginTop: 6,
    lineHeight: 21,
  },
  saleRow: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  saleRowMain: {
    flex: 1,
  },
  saleTitle: {
    color: MEATSHOP_COLORS.text,
    fontWeight: '800',
    fontSize: 15,
  },
  saleMeta: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  saleAmount: {
    color: MEATSHOP_COLORS.maroon,
    fontWeight: '900',
    fontSize: 15,
  },
});
