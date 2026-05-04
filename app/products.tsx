import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
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
  const router = useRouter();
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

    void load();

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

  const listHeader = (
    <View style={styles.headerContent}>
      <MeatshopPageHero
        eyebrow="Catalog"
        title="Products"
        subtitle="Create, search, and manage your catalog using the same polished layout as the dashboard."
      >
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaPill}>
            <MaterialCommunityIcons name="food-steak" size={16} color={MEATSHOP_COLORS.maroon} />
            <Text style={styles.heroMetaText}>{products.length} total items</Text>
          </View>
          <View style={styles.heroMetaPill}>
            <MaterialCommunityIcons name="filter-variant" size={16} color={MEATSHOP_COLORS.gold} />
            <Text style={styles.heroMetaText}>{visibleProducts.length} visible</Text>
          </View>
        </View>
      </MeatshopPageHero>

      <MeatshopSectionHeader
        title={canEditProducts ? 'Editor' : 'Catalog Access'}
        icon={<Feather name="edit-3" size={18} color={MEATSHOP_COLORS.maroon} />}
      />

      {canEditProducts ? (
        <MeatshopSurfaceCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.formHeaderCopy}>
              <Text style={styles.formTitle}>{selectedProduct ? 'Edit Product' : 'Add Product'}</Text>
              <Text style={styles.formMeta}>
                {selectedProduct
                  ? 'Update the selected item or clear the form to create a new one.'
                  : 'Fill in the fields below to add a new product to the catalog.'}
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
            placeholderTextColor={MEATSHOP_COLORS.soft}
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
                placeholderTextColor={MEATSHOP_COLORS.soft}
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
                placeholderTextColor={MEATSHOP_COLORS.soft}
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
              <Text style={styles.deleteButtonText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
            </Pressable>
          </View>
        </MeatshopSurfaceCard>
      ) : (
        <MeatshopSurfaceCard>
          <Text style={styles.readOnlyTitle}>Read Only</Text>
          <Text style={styles.readOnlyText}>
            Your role can view items but cannot create, edit, or delete products.
          </Text>
        </MeatshopSurfaceCard>
      )}

      <MeatshopSectionHeader
        title="Catalog"
        icon={<Feather name="search" size={18} color={MEATSHOP_COLORS.maroon} />}
      />

      <MeatshopSurfaceCard style={styles.filtersCard}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search products"
          placeholderTextColor={MEATSHOP_COLORS.soft}
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
            <ActivityIndicator size="small" color={MEATSHOP_COLORS.maroon} />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </MeatshopSurfaceCard>
    </View>
  );

  const blockedBody = !canViewProducts ? (
    <MeatshopSurfaceCard>
      <Text style={styles.blockedTitle}>Access Restricted</Text>
      <Text style={styles.blockedText}>
        Your current role does not allow access to the product catalog.
      </Text>
    </MeatshopSurfaceCard>
  ) : !catalogEntitlement.allowed ? (
    <MeatshopSurfaceCard>
      <LockedFeatureNotice
        title="Feature Locked"
        message={catalogEntitlement.message ?? 'Product catalog is not available for this plan.'}
        requiredPlan={catalogEntitlement.requiredPlan}
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
        <FlatList
          style={styles.list}
          data={visibleProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => {
            void refreshProducts();
          }}
          ListHeaderComponent={listHeader}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          renderItem={({ item }) => {
            const isSelected = selectedId === item.id;

            return (
              <Pressable onPress={() => setSelectedId(item.id)} style={[styles.card, isSelected && styles.cardSelected]}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardIconBubble}>
                    <MaterialCommunityIcons name="food-steak" size={26} color={MEATSHOP_COLORS.maroon} />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{item.type ?? 'Choice'}</Text>
                    </View>
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
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerContent: {
    gap: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
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
  formCard: {
    gap: 4,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 2,
  },
  formHeaderCopy: {
    flex: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: MEATSHOP_COLORS.text,
  },
  formMeta: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 22,
    color: MEATSHOP_COLORS.muted,
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '800',
    color: MEATSHOP_COLORS.text,
  },
  input: {
    ...MEATSHOP_INPUT,
  },
  fieldHint: {
    marginTop: 12,
    fontSize: 12,
    color: MEATSHOP_COLORS.muted,
  },
  typeSelector: {
    paddingVertical: 2,
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
  deleteButton: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: MEATSHOP_COLORS.dangerBg,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.dangerBorder,
  },
  deleteButtonText: {
    color: MEATSHOP_COLORS.dangerText,
    fontWeight: '800',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  ghostButton: {
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
  },
  ghostButtonText: {
    color: MEATSHOP_COLORS.text,
    fontWeight: '800',
    fontSize: 13,
  },
  readOnlyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: MEATSHOP_COLORS.text,
  },
  readOnlyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: MEATSHOP_COLORS.muted,
  },
  filtersCard: {
    gap: 2,
  },
  searchInput: {
    ...MEATSHOP_INPUT,
  },
  chipsContainer: {
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    ...MEATSHOP_PILL,
  },
  chipActive: {
    backgroundColor: MEATSHOP_COLORS.maroon,
    borderColor: MEATSHOP_COLORS.maroon,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: MEATSHOP_COLORS.muted,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  catalogMeta: {
    marginTop: 10,
    fontSize: 13,
    color: MEATSHOP_COLORS.muted,
  },
  loadingState: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: MEATSHOP_COLORS.muted,
  },
  errorBanner: {
    marginTop: 14,
    backgroundColor: MEATSHOP_COLORS.dangerBg,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.dangerBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: MEATSHOP_COLORS.dangerText,
    fontSize: 13,
    lineHeight: 20,
  },
  itemSeparator: {
    height: 12,
  },
  card: {
    backgroundColor: MEATSHOP_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    padding: 18,
    ...MEATSHOP_CARD_SHADOW,
  },
  cardSelected: {
    borderColor: MEATSHOP_COLORS.maroon,
    shadowOpacity: 0.14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardIconBubble: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: MEATSHOP_COLORS.roseTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    gap: 8,
  },
  productName: {
    fontSize: 22,
    fontWeight: '800',
    color: MEATSHOP_COLORS.text,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.dangerBorder,
    backgroundColor: MEATSHOP_COLORS.dangerBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: MEATSHOP_COLORS.dangerText,
  },
  cardBottomRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
    color: MEATSHOP_COLORS.muted,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '900',
    color: MEATSHOP_COLORS.maroon,
  },
  selectedText: {
    marginTop: 12,
    color: MEATSHOP_COLORS.maroon,
    fontWeight: '800',
    fontSize: 12,
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: MEATSHOP_COLORS.muted,
  },
});
