import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LockedFeatureNotice } from '../src/components/ui/LockedFeatureNotice';
import { hasPermission } from '../src/features/access/services/accessControl';
import { useAuditLogStore } from '../src/features/audit/store/useAuditLogStore';
import { useAuthStore } from '../src/features/auth/store/useAuthStore';
import {
  createProduct,
  deleteProduct,
  fetchProductsByTenant,
  updateProduct,
} from '../src/features/product/services/productService';
import { useProductStore } from '../src/features/product/store/useProductStore';
import type { Product, ProductType } from '../src/features/product/types/productTypes';
import { evaluateEntitlement } from '../src/features/subscription/services/entitlementService';
import { guardSubscriptionAccess } from '../src/features/subscription/services/subscriptionGuard';
import { useSubscriptionStore } from '../src/features/subscription/store/useSubscriptionStore';
import { useTenantStore } from '../src/features/tenant/store/useTenantStore';

const FILTERS: Array<'All' | ProductType> = [
  'All',
  'Prime',
  'Premium',
  'Select',
  'Choice',
  'Byproduct',
];

const PRODUCT_TYPES: ProductType[] = ['Prime', 'Premium', 'Select', 'Choice', 'Byproduct'];

const PRIMARY = '#B23A1D';

type ProductFormState = {
  name: string;
  type: ProductType;
  price: string;
  stock: string;
};

const EMPTY_FORM: ProductFormState = {
  name: '',
  type: 'Choice',
  price: '',
  stock: '0',
};

export default function ProductsScreen() {
  const user = useAuthStore((state) => state.user);
  const activeTenantId = useTenantStore((state) => state.activeTenantId);
  const products = useProductStore((state) => state.products);
  const setProducts = useProductStore((state) => state.setProducts);
  const appendAuditEvent = useAuditLogStore((state) => state.appendEvent);
  const subscriptionsByTenantId = useSubscriptionStore((state) => state.subscriptionsByTenantId);
  const usageByTenantId = useSubscriptionStore((state) => state.usageByTenantId);
  const patchUsage = useSubscriptionStore((state) => state.patchUsage);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | ProductType>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  const canViewProducts = hasPermission(user?.role, 'products.view');
  const canEditProducts = hasPermission(user?.role, 'products.edit');
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

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId],
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!activeTenantId || !canViewProducts || !catalogEntitlement.allowed) {
        if (mounted) {
          setProducts([]);
          setSelectedId(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const remoteProducts = await fetchProductsByTenant(activeTenantId);
        if (!mounted) return;

        setProducts(remoteProducts);
        patchUsage(activeTenantId, { productsCount: remoteProducts.length });

        if (user) {
          appendAuditEvent({
            id: `audit_${Date.now()}`,
            tenantId: activeTenantId,
            userId: user.id,
            action: 'products.fetch',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        if (!mounted) return;
        console.warn('Failed to load products from Firestore:', err);
        setError(err?.message ? String(err.message) : 'Failed to load products');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [
    activeTenantId,
    appendAuditEvent,
    canViewProducts,
    catalogEntitlement.allowed,
    patchUsage,
    setProducts,
    user,
  ]);

  useEffect(() => {
    if (!selectedProduct) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      name: selectedProduct.name,
      type: selectedProduct.type ?? 'Choice',
      price: String(selectedProduct.price),
      stock: String(selectedProduct.stock ?? 0),
    });
  }, [selectedProduct]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return [...products]
      .filter((product) => {
        const productType = product.type ?? 'Choice';
        const matchesFilter = activeFilter === 'All' ? true : productType === activeFilter;
        const matchesSearch =
          normalized.length === 0 ? true : product.name.toLowerCase().includes(normalized);
        return matchesFilter && matchesSearch;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [activeFilter, products, query]);

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

  function clearSelection() {
    setSelectedId(null);
    setForm(EMPTY_FORM);
  }

  function validateForm(): Omit<Product, 'id'> | null {
    const name = form.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Enter a product name before saving.');
      return null;
    }

    const parsedPrice = Number(form.price);
    if (!form.price.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Invalid price', 'Price must be a valid number greater than or equal to 0.');
      return null;
    }

    const parsedStock = form.stock.trim() === '' ? 0 : Number(form.stock);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      Alert.alert('Invalid stock', 'Stock must be a valid number greater than or equal to 0.');
      return null;
    }

    return {
      name,
      type: form.type,
      unit: 'kg',
      price: parsedPrice,
      stock: parsedStock,
    };
  }

  async function refreshProducts() {
    if (!activeTenantId) return;

    setRefreshing(true);
    setError(null);
    try {
      const remoteProducts = await fetchProductsByTenant(activeTenantId);
      setProducts(remoteProducts);
      patchUsage(activeTenantId, { productsCount: remoteProducts.length });

      if (user) {
        appendAuditEvent({
          id: `audit_${Date.now()}`,
          tenantId: activeTenantId,
          userId: user.id,
          action: 'products.fetch',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setError(err?.message ? String(err.message) : 'Failed to load products');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSave() {
    if (!canEditProducts) {
      Alert.alert('Read only', 'Your role can view products but cannot change them.');
      return;
    }

    if (!activeTenantId) {
      Alert.alert('No tenant selected', 'Please select an active tenant first.');
      return;
    }

    const payload = validateForm();
    if (!payload) {
      return;
    }

    if (!selectedProduct) {
      if (!subscription || !usage) {
        Alert.alert('Subscription unavailable', 'No active subscription data was found for this tenant.');
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
              meta: {
                reason: decision.reason ?? 'unknown',
                requiredPlan: decision.requiredPlan ?? 'none',
              },
            });
          }
        },
      });

      if (!canAddProduct) {
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (selectedProduct) {
        await updateProduct(selectedProduct.id, payload);
        const nextProducts = products.map((product) =>
          product.id === selectedProduct.id ? { ...product, ...payload } : product,
        );
        setProducts(nextProducts);
        Alert.alert('Updated', 'Product changes were saved.');
      } else {
        const productId = await createProduct(activeTenantId, payload);
        const nextProduct: Product = { id: productId, ...payload };
        const nextProducts = [nextProduct, ...products];
        setProducts(nextProducts);
        patchUsage(activeTenantId, { productsCount: nextProducts.length });
        setSelectedId(productId);
        Alert.alert('Created', 'New product added to the catalog.');
      }
    } catch (err: any) {
      const message = err?.message ? String(err.message) : 'Failed to save product';
      setError(message);
      Alert.alert('Failed', message);
    } finally {
      setSaving(false);
    }
  }

  async function performDelete(product: Product) {
    if (!activeTenantId) {
      Alert.alert('No tenant selected', 'Please select an active tenant first.');
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteProduct(product.id);
      const nextProducts = products.filter((item) => item.id !== product.id);
      setProducts(nextProducts);
      patchUsage(activeTenantId, { productsCount: nextProducts.length });
      clearSelection();
      Alert.alert('Deleted', 'Product removed from the catalog.');
    } catch (err: any) {
      const message = err?.message ? String(err.message) : 'Failed to delete product';
      setError(message);
      Alert.alert('Failed', message);
    } finally {
      setDeleting(false);
    }
  }

  function requestDelete() {
    if (!selectedProduct) {
      return;
    }

    Alert.alert(
      'Delete product?',
      `Remove ${selectedProduct.name} from the catalog? Inventory history may still reference this item.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void performDelete(selectedProduct);
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Products</Text>
        <Text style={styles.subtitle}>Create, view, update, and delete catalog items.</Text>

        {canEditProducts ? (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.formTitle}>
                  {selectedProduct ? 'Edit Product' : 'Add Product'}
                </Text>
                <Text style={styles.formMeta}>
                  {selectedProduct
                    ? 'Select a different item below or update the fields here.'
                    : 'Fill in the form and save to create a new product.'}
                </Text>
              </View>
              {selectedProduct ? (
                <Pressable onPress={clearSelection} style={styles.ghostButton}>
                  <Text style={styles.ghostButtonText}>New</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.fieldLabel}>Product Name</Text>
            <TextInput
              value={form.name}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              placeholder="e.g. Ribeye Steak"
              placeholderTextColor="#8A8A8A"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <FlatList
              data={PRODUCT_TYPES}
              horizontal
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeSelector}
              renderItem={({ item }) => {
                const isActive = form.type === item;

                return (
                  <Pressable
                    onPress={() => setForm((current) => ({ ...current, type: item }))}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{item}</Text>
                  </Pressable>
                );
              }}
            />

            <View style={styles.row}>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Price</Text>
                <TextInput
                  value={form.price}
                  onChangeText={(price) => setForm((current) => ({ ...current, price }))}
                  placeholder="0.00"
                  placeholderTextColor="#8A8A8A"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Stock</Text>
                <TextInput
                  value={form.stock}
                  onChangeText={(stock) => setForm((current) => ({ ...current, stock }))}
                  placeholder="0"
                  placeholderTextColor="#8A8A8A"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.fieldHint}>Unit is currently fixed to kilograms (`kg`).</Text>

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => {
                  void handleSave();
                }}
                disabled={saving || deleting}
                style={[styles.primaryButton, (saving || deleting) && styles.buttonDisabled]}
              >
                <Text style={styles.primaryButtonText}>
                  {selectedProduct
                    ? saving
                      ? 'Saving...'
                      : 'Update Product'
                    : saving
                      ? 'Creating...'
                      : 'Create Product'}
                </Text>
              </Pressable>

              <Pressable
                onPress={clearSelection}
                disabled={saving || deleting}
                style={[styles.secondaryButton, (saving || deleting) && styles.buttonDisabled]}
              >
                <Text style={styles.secondaryButtonText}>
                  {selectedProduct ? 'Cancel Edit' : 'Clear Form'}
                </Text>
              </Pressable>

              <Pressable
                onPress={requestDelete}
                disabled={!selectedProduct || saving || deleting}
                style={[
                  styles.deleteButton,
                  (!selectedProduct || saving || deleting) && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.deleteButtonText}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.readOnlyCard}>
            <Text style={styles.readOnlyTitle}>Read Only</Text>
            <Text style={styles.readOnlyText}>
              Your role can view items but cannot create, edit, or delete products.
            </Text>
          </View>
        )}

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

        <Text style={styles.catalogMeta}>
          Showing {visibleProducts.length} of {products.length} products
        </Text>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={PRIMARY} />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => {
          void refreshProducts();
        }}
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
                <Text style={styles.metaText}>
                  Stock: {item.stock ?? 0} {item.unit ?? 'kg'}
                </Text>
                <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
              </View>

              {isSelected ? <Text style={styles.selectedText}>Selected for editing</Text> : null}
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
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DED1',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1C17',
  },
  formMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6A655B',
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#383127',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DED1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F1C17',
  },
  fieldHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#6A655B',
  },
  typeSelector: {
    paddingTop: 2,
    paddingBottom: 2,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowField: {
    flex: 1,
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
    borderColor: '#D9D0C2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: '#4D463A',
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#FFF1EC',
    borderWidth: 1,
    borderColor: '#F2D2C6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  deleteButtonText: {
    color: '#A23821',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  ghostButton: {
    backgroundColor: '#F3EFE7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ghostButtonText: {
    color: '#4D463A',
    fontWeight: '700',
    fontSize: 13,
  },
  readOnlyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DED1',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  readOnlyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F1C17',
  },
  readOnlyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#6A655B',
    lineHeight: 20,
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
  catalogMeta: {
    marginTop: 10,
    fontSize: 13,
    color: '#6A655B',
  },
  loadingState: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#6A655B',
  },
  errorBanner: {
    marginTop: 12,
    backgroundColor: '#FFF1EC',
    borderWidth: 1,
    borderColor: '#F2D2C6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: '#A23821',
    fontSize: 13,
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
    gap: 12,
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
  selectedText: {
    marginTop: 10,
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 12,
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
});
