import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { LockedFeatureNotice } from '../src/components/ui/LockedFeatureNotice';
import { hasPermission } from '../src/features/access/services/accessControl';
import { useAuditLogStore } from '../src/features/audit/store/useAuditLogStore';
import { useAuthStore } from '../src/features/auth/store/useAuthStore';
import { useProductStore } from '../src/features/product/store/useProductStore';
import { evaluateEntitlement } from '../src/features/subscription/services/entitlementService';
import { guardSubscriptionAccess } from '../src/features/subscription/services/subscriptionGuard';
import { useSubscriptionStore } from '../src/features/subscription/store/useSubscriptionStore';
import { useSyncQueueStore } from '../src/features/sync/store/useSyncQueueStore';
import { useTenantStore } from '../src/features/tenant/store/useTenantStore';
import type { Product, ProductType } from '../src/features/product/types/productTypes';

const FILTERS: Array<'All' | ProductType> = [
  'All',
  'Prime',
  'Premium',
  'Select',
  'Choice',
  'Byproduct',
];

const SEED_PRODUCTS: Product[] = [
  { id: 'prd_1', name: 'Ribeye Steak', type: 'Prime', unit: 'kg', price: 39.5, stock: 16 },
  { id: 'prd_2', name: 'Tenderloin', type: 'Premium', unit: 'kg', price: 42, stock: 11 },
  { id: 'prd_3', name: 'Sirloin', type: 'Select', unit: 'kg', price: 28.75, stock: 20 },
  { id: 'prd_4', name: 'Chuck Roast', type: 'Choice', unit: 'kg', price: 19.25, stock: 26 },
  { id: 'prd_5', name: 'Beef Liver', type: 'Byproduct', unit: 'kg', price: 8.5, stock: 34 },
  { id: 'prd_6', name: 'Short Ribs', type: 'Prime', unit: 'kg', price: 31, stock: 14 },
  { id: 'prd_7', name: 'Brisket', type: 'Premium', unit: 'kg', price: 26.4, stock: 18 },
  { id: 'prd_8', name: 'Ground Beef', type: 'Choice', unit: 'kg', price: 14.9, stock: 40 },
];

const PRIMARY = '#B23A1D';

export default function ProductsScreen() {
  const user = useAuthStore((state) => state.user);
  const activeTenantId = useTenantStore((state) => state.activeTenantId);
  const products = useProductStore((state) => state.products);
  const setProducts = useProductStore((state) => state.setProducts);
  const enqueueSync = useSyncQueueStore((state) => state.enqueue);
  const queueSize = useSyncQueueStore((state) => state.queue.length);
  const appendAuditEvent = useAuditLogStore((state) => state.appendEvent);
  const subscriptionsByTenantId = useSubscriptionStore((state) => state.subscriptionsByTenantId);
  const usageByTenantId = useSubscriptionStore((state) => state.usageByTenantId);
  const incrementUsage = useSubscriptionStore((state) => state.incrementUsage);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | ProductType>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canViewProducts = hasPermission(user?.role, 'products.view');
  const subscription = activeTenantId ? subscriptionsByTenantId[activeTenantId] : undefined;
  const usage = activeTenantId ? usageByTenantId[activeTenantId] : undefined;

  const catalogEntitlement =
    subscription && usage
      ? evaluateEntitlement({
          subscription,
          usage,
          feature: 'canManageProducts',
        })
      : {
          allowed: false,
          reason: 'subscription_inactive' as const,
          message: 'No subscription found for this tenant. Attach a plan to continue.',
        };

  useEffect(() => {
    if (products.length === 0 && canViewProducts && catalogEntitlement.allowed) {
      setProducts(SEED_PRODUCTS);
      if (user && activeTenantId) {
        appendAuditEvent({
          id: `audit_${Date.now()}`,
          tenantId: activeTenantId,
          userId: user.id,
          action: 'products.seed',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }, [
    activeTenantId,
    appendAuditEvent,
    catalogEntitlement.allowed,
    canViewProducts,
    products.length,
    setProducts,
    user,
  ]);

  if (!canViewProducts) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blockedState}>
          <Text style={styles.blockedTitle}>Access Restricted</Text>
          <Text style={styles.blockedText}>
            Your current role does not allow access to the product catalog.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!catalogEntitlement.allowed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blockedState}>
          <LockedFeatureNotice
            title="Feature Locked"
            message={catalogEntitlement.message ?? 'Product catalog is not available for this plan.'}
            requiredPlan={catalogEntitlement.requiredPlan}
          />
        </View>
      </SafeAreaView>
    );
  }

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return products.filter((product) => {
      const productType = product.type ?? 'Choice';
      const matchesFilter = activeFilter === 'All' ? true : productType === activeFilter;
      const matchesSearch =
        normalized.length === 0 ? true : product.name.toLowerCase().includes(normalized);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, products, query]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Product Selection</Text>
        <Text style={styles.subtitle}>Choose an item to add to the current sale</Text>
        <Text style={styles.queueText}>Pending sync actions: {queueSize}</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search products"
          placeholderTextColor="#8A8A8A"
          style={styles.searchInput}
        />

        <FlatList
          data={FILTERS}
          horizontal
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
          renderItem={({ item }) => {
            const isActive = activeFilter === item;

            return (
              <Pressable
                onPress={() => setActiveFilter(item)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{item}</Text>
              </Pressable>
            );
          }}
        />

        <Pressable
          onPress={() => {
            if (!user || !activeTenantId) {
              return;
            }

            enqueueSync({
              id: `sync_${Date.now()}`,
              tenantId: activeTenantId,
              entity: 'product',
              operation: 'update',
              payload: { reason: 'supplier_price_import_refresh' },
              queuedAt: new Date().toISOString(),
            });

            appendAuditEvent({
              id: `audit_${Date.now()}`,
              tenantId: activeTenantId,
              userId: user.id,
              action: 'sync.enqueue',
              createdAt: new Date().toISOString(),
              meta: { entity: 'product' },
            });
          }}
          style={styles.syncButton}
        >
          <Text style={styles.syncButtonText}>Queue Supplier Price Sync</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!activeTenantId || !subscription || !usage) {
              return;
            }

            const canAddProduct = guardSubscriptionAccess({
              subscription,
              usage,
              requiredLimit: 'maxProducts',
              unitsToAdd: 1,
              onDenied: (decision) => {
                if (user) {
                  appendAuditEvent({
                    id: `audit_${Date.now()}`,
                    tenantId: activeTenantId,
                    userId: user.id,
                    action: 'subscription.limit_blocked',
                    createdAt: new Date().toISOString(),
                    meta: { reason: decision.reason, requiredPlan: decision.requiredPlan },
                  });
                }
              },
            });

            if (!canAddProduct) {
              return;
            }

            const product: Product = {
              id: `prd_${Date.now()}`,
              name: `New Product ${products.length + 1}`,
              type: 'Choice',
              unit: 'kg',
              price: 10,
              stock: 0,
            };

            setProducts([...products, product]);
            incrementUsage(activeTenantId, 'productsCount', 1);
          }}
          style={styles.syncButton}
        >
          <Text style={styles.syncButtonText}>Add Demo Product (Limit Enforced)</Text>
        </Pressable>
      </View>

      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        renderItem={({ item }) => {
          const isSelected = selectedId === item.id;

          return (
            <Pressable
              onPress={() => setSelectedId(item.id)}
              style={[styles.card, isSelected && styles.cardSelected]}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.productName}>{item.name}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{item.type ?? 'Choice'}</Text>
                </View>
              </View>

              <View style={styles.cardBottomRow}>
                <Text style={styles.metaText}>Unit: {item.unit ?? 'kg'}</Text>
                <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No matching products found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F3',
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1C17',
  },
  subtitle: {
    marginTop: 3,
    marginBottom: 12,
    fontSize: 14,
    color: '#6A655B',
  },
  queueText: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 13,
    color: '#6A655B',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DED1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F1C17',
  },
  chipsContainer: {
    paddingTop: 12,
    paddingBottom: 2,
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DED1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#686250',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  itemSeparator: {
    height: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E1D4',
    padding: 14,
    shadowColor: '#1B120B',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardSelected: {
    borderColor: PRIMARY,
    shadowOpacity: 0.14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  productName: {
    flex: 1,
    fontSize: 21,
    fontWeight: '700',
    color: '#1E1B15',
  },
  typeBadge: {
    borderWidth: 1,
    borderColor: '#F2D2C6',
    backgroundColor: '#FFF1EC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A23821',
  },
  cardBottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666052',
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800',
    color: PRIMARY,
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#726C60',
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
    color: '#2A241E',
    marginBottom: 8,
  },
  blockedText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#6C6659',
  },
  syncButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#E9F2FF',
    borderWidth: 1,
    borderColor: '#C8DCF9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  syncButtonText: {
    color: '#2B4E86',
    fontWeight: '600',
    fontSize: 13,
  },
});
