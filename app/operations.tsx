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
import {
  createBusinessContact,
  deleteBusinessContact,
  fetchContactsByTenant,
  updateBusinessContact,
} from '../src/features/contact/services/contactService';
import { useContactStore } from '../src/features/contact/store/useContactStore';
import type { BusinessContact, ContactKind } from '../src/features/contact/types/contactTypes';
import { createStockIn } from '../src/features/inventory/services/inventoryService';
import { useInventoryStore } from '../src/features/inventory/store/useInventoryStore';
import { fetchProductsByTenant } from '../src/features/product/services/productService';
import { useProductStore } from '../src/features/product/store/useProductStore';
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  fetchPurchaseOrdersByTenant,
  updatePurchaseOrder,
} from '../src/features/purchase/services/purchaseService';
import { usePurchaseStore } from '../src/features/purchase/store/usePurchaseStore';
import type { PurchaseOrder } from '../src/features/purchase/types/purchaseTypes';
import { evaluateEntitlement } from '../src/features/subscription/services/entitlementService';
import { useSubscriptionStore } from '../src/features/subscription/store/useSubscriptionStore';
import { useTenantStore } from '../src/features/tenant/store/useTenantStore';

type ScreenTab = 'suppliers' | 'customers' | 'purchases';

type ContactFormState = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

type PurchaseFormState = {
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: string;
  cost: string;
  expiryDate: string;
  notes: string;
};

const EMPTY_CONTACT_FORM: ContactFormState = {
  name: '',
  phone: '',
  email: '',
  notes: '',
};

const EMPTY_PURCHASE_FORM: PurchaseFormState = {
  supplierId: '',
  supplierName: '',
  productId: '',
  productName: '',
  quantity: '',
  cost: '',
  expiryDate: '',
  notes: '',
};

export default function OperationsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const products = useProductStore((state) => state.products);
  const setProducts = useProductStore((state) => state.setProducts);
  const contacts = useContactStore((state) => state.contacts);
  const setContacts = useContactStore((state) => state.setContacts);
  const upsertContact = useContactStore((state) => state.upsertContact);
  const removeContact = useContactStore((state) => state.removeContact);
  const purchases = usePurchaseStore((state) => state.purchases);
  const setPurchases = usePurchaseStore((state) => state.setPurchases);
  const upsertPurchase = usePurchaseStore((state) => state.upsertPurchase);
  const removePurchase = usePurchaseStore((state) => state.removePurchase);
  const summaries = useInventoryStore((state) => state.summaries);
  const setSummaries = useInventoryStore((state) => state.setSummaries);
  const subscriptionsByTenantId = useSubscriptionStore((state) => state.subscriptionsByTenantId);
  const usageByTenantId = useSubscriptionStore((state) => state.usageByTenantId);

  const [activeTab, setActiveTab] = useState<ScreenTab>('suppliers');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(EMPTY_PURCHASE_FORM);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const activeSubscription = tenantId ? subscriptionsByTenantId[tenantId] : undefined;
  const activeUsage = tenantId ? usageByTenantId[tenantId] : undefined;

  const canManageOperations =
    hasPermission(user?.role, 'purchase.create') ||
    hasPermission(user?.role, 'purchase.receive') ||
    hasPermission(user?.role, 'products.edit');

  const operationsEntitlement =
    activeSubscription && activeUsage
      ? evaluateEntitlement({
          subscription: activeSubscription,
          usage: activeUsage,
          feature: 'canManagePurchaseOrders',
        })
      : {
          allowed: false,
          reason: 'subscription_inactive' as const,
          message: 'No subscription found for this store.',
        };

  const supplierEntitlement =
    activeSubscription && activeUsage
      ? evaluateEntitlement({
          subscription: activeSubscription,
          usage: activeUsage,
          feature: 'canManageSuppliers',
        })
      : operationsEntitlement;

  const customerEntitlement =
    activeSubscription && activeUsage
      ? evaluateEntitlement({
          subscription: activeSubscription,
          usage: activeUsage,
          feature: 'canManageCustomers',
        })
      : operationsEntitlement;

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
        console.warn('Failed to load products for operations', error);
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

    async function loadOperationsData() {
      if (!tenantId) {
        return;
      }

      try {
        const [remoteContacts, remotePurchases] = await Promise.all([
          fetchContactsByTenant(tenantId),
          fetchPurchaseOrdersByTenant(tenantId),
        ]);

        if (!mounted) {
          return;
        }

        setContacts(remoteContacts);
        setPurchases(remotePurchases);
      } catch (error) {
        console.warn('Failed to load operations data', error);
      }
    }

    void loadOperationsData();
    return () => {
      mounted = false;
    };
  }, [setContacts, setPurchases, tenantId]);

  const suppliers = useMemo(
    () => contacts.filter((contact) => contact.tenantId === tenantId && contact.kind === 'supplier'),
    [contacts, tenantId],
  );
  const customers = useMemo(
    () => contacts.filter((contact) => contact.tenantId === tenantId && contact.kind === 'customer'),
    [contacts, tenantId],
  );
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );
  const selectedPurchase = useMemo(
    () => purchases.find((purchase) => purchase.id === selectedPurchaseId) ?? null,
    [purchases, selectedPurchaseId],
  );

  useEffect(() => {
    if (!selectedContact) {
      setContactForm(EMPTY_CONTACT_FORM);
      return;
    }

    setContactForm({
      name: selectedContact.name,
      phone: selectedContact.phone,
      email: selectedContact.email ?? '',
      notes: selectedContact.notes ?? '',
    });
  }, [selectedContact]);

  useEffect(() => {
    if (!selectedPurchase) {
      setPurchaseForm(EMPTY_PURCHASE_FORM);
      return;
    }

    setPurchaseForm({
      supplierId: selectedPurchase.supplierId ?? '',
      supplierName: selectedPurchase.supplierName,
      productId: selectedPurchase.productId,
      productName: selectedPurchase.productName,
      quantity: String(selectedPurchase.quantity),
      cost: String(selectedPurchase.cost),
      expiryDate: selectedPurchase.expiryDate ?? '',
      notes: selectedPurchase.notes ?? '',
    });
  }, [selectedPurchase]);

  function currentContactKind(): ContactKind {
    return activeTab === 'customers' ? 'customer' : 'supplier';
  }

  function clearContactForm() {
    setSelectedContactId(null);
    setContactForm(EMPTY_CONTACT_FORM);
  }

  function clearPurchaseForm() {
    setSelectedPurchaseId(null);
    setPurchaseForm(EMPTY_PURCHASE_FORM);
  }

  async function saveContact() {
    if (!tenantId) {
      Alert.alert('No store selected', 'Please sign in to a store before saving contacts.');
      return;
    }

    const name = contactForm.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Enter a supplier or customer name.');
      return;
    }

    const contact: BusinessContact = {
      id: selectedContact?.id ?? `${currentContactKind().slice(0, 3)}_${Date.now()}`,
      tenantId,
      kind: currentContactKind(),
      name,
      phone: contactForm.phone.trim() || 'N/A',
      email: contactForm.email.trim(),
      notes: contactForm.notes.trim(),
      createdAt: selectedContact?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (selectedContact) {
        await updateBusinessContact(contact.id, {
          tenantId: contact.tenantId,
          kind: contact.kind,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          notes: contact.notes,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
        });
      } else {
        await createBusinessContact(contact);
      }

      upsertContact(contact);
      setSelectedContactId(contact.id);
      Alert.alert(
        selectedContact ? 'Updated' : 'Saved',
        `${contact.kind === 'supplier' ? 'Supplier' : 'Customer'} record stored successfully.`,
      );
    } catch (error: any) {
      Alert.alert('Failed', String(error?.message ?? error));
    }
  }

  function deleteSelectedContact() {
    if (!selectedContact) {
      return;
    }

    Alert.alert(
      'Delete contact?',
      `Remove ${selectedContact.name} from the ${selectedContact.kind} list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteBusinessContact(selectedContact.id);
                removeContact(selectedContact.id);
                clearContactForm();
              } catch (error: any) {
                Alert.alert('Failed', String(error?.message ?? error));
              }
            })();
          },
        },
      ],
    );
  }

  async function savePurchase() {
    if (!tenantId) {
      Alert.alert('No store selected', 'Please sign in to a store before creating purchase orders.');
      return;
    }

    const quantity = Number(purchaseForm.quantity);
    const cost = Number(purchaseForm.cost);

    if (!purchaseForm.productId) {
      Alert.alert('Product required', 'Choose a product for this purchase order.');
      return;
    }

    if (!purchaseForm.supplierName.trim()) {
      Alert.alert('Supplier required', 'Choose or enter a supplier name.');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Invalid quantity', 'Quantity must be greater than 0.');
      return;
    }

    if (!Number.isFinite(cost) || cost < 0) {
      Alert.alert('Invalid cost', 'Cost must be a valid number.');
      return;
    }

    if (purchaseForm.expiryDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(purchaseForm.expiryDate.trim())) {
      Alert.alert('Invalid expiry', 'Use the YYYY-MM-DD format for expiry.');
      return;
    }

    const purchase: PurchaseOrder = {
      id: selectedPurchase?.id ?? `po_${Date.now()}`,
      tenantId,
      supplierId: purchaseForm.supplierId || undefined,
      supplierName: purchaseForm.supplierName.trim(),
      productId: purchaseForm.productId,
      productName: purchaseForm.productName,
      quantity,
      cost,
      expiryDate: purchaseForm.expiryDate.trim() || null,
      notes: purchaseForm.notes.trim(),
      status: selectedPurchase?.status === 'received' ? 'received' : 'ordered',
      createdAt: selectedPurchase?.createdAt ?? new Date().toISOString(),
      receivedAt: selectedPurchase?.receivedAt,
    };

    try {
      if (selectedPurchase) {
        await updatePurchaseOrder(purchase.id, {
          tenantId: purchase.tenantId,
          supplierId: purchase.supplierId,
          supplierName: purchase.supplierName,
          productId: purchase.productId,
          productName: purchase.productName,
          quantity: purchase.quantity,
          cost: purchase.cost,
          expiryDate: purchase.expiryDate ?? null,
          notes: purchase.notes,
          status: purchase.status,
          createdAt: purchase.createdAt,
          receivedAt: purchase.receivedAt,
        });
      } else {
        await createPurchaseOrder(purchase);
      }

      upsertPurchase(purchase);
      setSelectedPurchaseId(purchase.id);
      Alert.alert(selectedPurchase ? 'Updated' : 'Saved', 'Purchase order saved successfully.');
    } catch (error: any) {
      Alert.alert('Failed', String(error?.message ?? error));
    }
  }

  async function receivePurchase(purchase: PurchaseOrder) {
    if (!tenantId) {
      Alert.alert('No store selected', 'Please sign in to a store before receiving deliveries.');
      return;
    }

    if (purchase.status === 'received') {
      Alert.alert('Already received', 'This purchase order has already been received.');
      return;
    }

    setReceivingId(purchase.id);
    try {
      await createStockIn({
        tenantId,
        productId: purchase.productId,
        quantity: purchase.quantity,
        cost: purchase.cost,
        expiryDate: purchase.expiryDate ?? null,
        userId: user?.id,
        notes: purchase.notes ? `PO ${purchase.id}: ${purchase.notes}` : `PO ${purchase.id}`,
      });

      const receivedPurchase: PurchaseOrder = {
        ...purchase,
        status: 'received',
        receivedAt: new Date().toISOString(),
      };

      await updatePurchaseOrder(purchase.id, {
        status: receivedPurchase.status,
        receivedAt: receivedPurchase.receivedAt,
      });

      upsertPurchase(receivedPurchase);

      setProducts(
        products.map((product) =>
          product.id === purchase.productId
            ? { ...product, stock: Number(product.stock ?? 0) + purchase.quantity }
            : product,
        ),
      );

      if (summaries.length > 0) {
        const existing = summaries.some((summary) => summary.productId === purchase.productId);
        setSummaries(
          existing
            ? summaries.map((summary) =>
                summary.productId === purchase.productId
                  ? {
                      ...summary,
                      totalQuantity: Number(summary.totalQuantity ?? 0) + purchase.quantity,
                      batchesCount: Number(summary.batchesCount ?? 0) + 1,
                      nextExpiryDate: purchase.expiryDate ?? summary.nextExpiryDate ?? null,
                    }
                  : summary,
              )
            : [
                {
                  productId: purchase.productId,
                  productName: purchase.productName,
                  tenantId,
                  totalQuantity: purchase.quantity,
                  reservedQuantity: 0,
                  lowStock: false,
                  batchesCount: 1,
                  nextExpiryDate: purchase.expiryDate ?? null,
                },
                ...summaries,
              ],
        );
      }

      Alert.alert('Received', `${purchase.productName} was added to inventory.`);
    } catch (error: any) {
      Alert.alert('Failed', String(error?.message ?? error));
    } finally {
      setReceivingId(null);
    }
  }

  async function deletePurchase(purchaseId: string) {
    try {
      await deletePurchaseOrder(purchaseId);
      removePurchase(purchaseId);
      if (selectedPurchaseId === purchaseId) {
        clearPurchaseForm();
      }
    } catch (error: any) {
      Alert.alert('Failed', String(error?.message ?? error));
    }
  }

  const visibleContacts = activeTab === 'customers' ? customers : suppliers;
  const scopedPurchases = purchases.filter((purchase) => purchase.tenantId === tenantId);

  const blockedBody = !canManageOperations ? (
    <MeatshopSurfaceCard>
      <Text style={styles.blockedTitle}>Access Restricted</Text>
      <Text style={styles.blockedText}>
        Your current role cannot manage suppliers, customers, or purchase orders.
      </Text>
    </MeatshopSurfaceCard>
  ) : !operationsEntitlement.allowed ? (
    <MeatshopSurfaceCard>
      <LockedFeatureNotice
        title="Operations Locked"
        message={operationsEntitlement.message ?? 'Upgrade your plan to manage store operations.'}
        requiredPlan={operationsEntitlement.requiredPlan}
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
            eyebrow="Workflow"
            title="Store Operations"
            subtitle="Manage suppliers, customers, purchase orders, and receiving with the same dashboard-inspired workspace."
          >
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaPill}>
                <MaterialCommunityIcons name="truck-delivery-outline" size={16} color={MEATSHOP_COLORS.maroon} />
                <Text style={styles.heroMetaText}>{suppliers.length} suppliers</Text>
              </View>
              <View style={styles.heroMetaPill}>
                <MaterialCommunityIcons name="account-group-outline" size={16} color={MEATSHOP_COLORS.gold} />
                <Text style={styles.heroMetaText}>{customers.length} customers</Text>
              </View>
              <View style={styles.heroMetaPill}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={16} color={MEATSHOP_COLORS.gold} />
                <Text style={styles.heroMetaText}>{scopedPurchases.length} purchase orders</Text>
              </View>
            </View>
          </MeatshopPageHero>

          <MeatshopSectionHeader
            title="Mode"
            icon={<Feather name="layers" size={18} color={MEATSHOP_COLORS.maroon} />}
          />

          <View style={styles.tabRow}>
            {(['suppliers', 'customers', 'purchases'] as ScreenTab[]).map((tab) => {
              const active = activeTab === tab;
              const label =
                tab === 'suppliers' ? 'Suppliers' : tab === 'customers' ? 'Customers' : 'Purchases';
              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    setActiveTab(tab);
                    if (tab !== 'purchases') {
                      clearPurchaseForm();
                    } else {
                      clearContactForm();
                    }
                  }}
                  style={[styles.tabButton, active && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {activeTab !== 'purchases' ? (
            !(
              activeTab === 'suppliers' ? supplierEntitlement.allowed : customerEntitlement.allowed
            ) ? (
              <MeatshopSurfaceCard>
                <LockedFeatureNotice
                  title={`${activeTab === 'suppliers' ? 'Supplier' : 'Customer'} Tools Locked`}
                  message="This plan does not include contact management."
                  requiredPlan={
                    activeTab === 'suppliers'
                      ? supplierEntitlement.requiredPlan
                      : customerEntitlement.requiredPlan
                  }
                />
              </MeatshopSurfaceCard>
            ) : (
              <>
                <MeatshopSectionHeader
                  title={selectedContactId ? 'Edit Contact' : `Add ${activeTab === 'suppliers' ? 'Supplier' : 'Customer'}`}
                  icon={<Feather name="edit-3" size={18} color={MEATSHOP_COLORS.maroon} />}
                />

                <MeatshopSurfaceCard>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    value={contactForm.name}
                    onChangeText={(name) => setContactForm((current) => ({ ...current, name }))}
                    style={styles.input}
                    placeholder="Enter contact name"
                    placeholderTextColor={MEATSHOP_COLORS.soft}
                  />

                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    value={contactForm.phone}
                    onChangeText={(phone) => setContactForm((current) => ({ ...current, phone }))}
                    style={styles.input}
                    placeholder="Contact number"
                    placeholderTextColor={MEATSHOP_COLORS.soft}
                  />

                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    value={contactForm.email}
                    onChangeText={(email) => setContactForm((current) => ({ ...current, email }))}
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={MEATSHOP_COLORS.soft}
                    autoCapitalize="none"
                  />

                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    value={contactForm.notes}
                    onChangeText={(notes) => setContactForm((current) => ({ ...current, notes }))}
                    style={[styles.input, styles.notesInput]}
                    placeholder="Special notes"
                    placeholderTextColor={MEATSHOP_COLORS.soft}
                    multiline
                  />

                  <View style={styles.actionRow}>
                    <Pressable onPress={saveContact} style={styles.primaryButton}>
                      <Text style={styles.primaryButtonText}>{selectedContactId ? 'Update Contact' : 'Save Contact'}</Text>
                    </Pressable>
                    <Pressable onPress={clearContactForm} style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Clear</Text>
                    </Pressable>
                    <Pressable
                      onPress={deleteSelectedContact}
                      disabled={!selectedContactId}
                      style={[styles.deleteButton, !selectedContactId && styles.disabledButton]}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </MeatshopSurfaceCard>

                <MeatshopSurfaceCard>
                  <Text style={styles.cardTitle}>
                    {activeTab === 'suppliers' ? 'Supplier List' : 'Customer List'}
                  </Text>
                  {visibleContacts.length === 0 ? (
                    <Text style={styles.emptyText}>No records yet.</Text>
                  ) : (
                    visibleContacts.map((contact) => {
                      const selected = contact.id === selectedContactId;
                      return (
                        <Pressable
                          key={contact.id}
                          onPress={() => setSelectedContactId(contact.id)}
                          style={[styles.listRow, selected && styles.listRowSelected]}
                        >
                          <View style={styles.listRowMain}>
                            <Text style={styles.listRowTitle}>{contact.name}</Text>
                            <Text style={styles.listRowMeta}>
                              {contact.phone} {contact.email ? `| ${contact.email}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.listRowHint}>{selected ? 'Editing' : 'Tap to edit'}</Text>
                        </Pressable>
                      );
                    })
                  )}
                </MeatshopSurfaceCard>
              </>
            )
          ) : (
            <>
              <MeatshopSectionHeader
                title={selectedPurchaseId ? 'Edit Purchase Order' : 'Create Purchase Order'}
                icon={<Feather name="package" size={18} color={MEATSHOP_COLORS.maroon} />}
              />

              <MeatshopSurfaceCard>
                <Text style={styles.label}>Choose Supplier</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {suppliers.map((supplier) => {
                    const active = purchaseForm.supplierId === supplier.id;
                    return (
                      <Pressable
                        key={supplier.id}
                        onPress={() =>
                          setPurchaseForm((current) => ({
                            ...current,
                            supplierId: supplier.id,
                            supplierName: supplier.name,
                          }))
                        }
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{supplier.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={styles.label}>Supplier Name</Text>
                <TextInput
                  value={purchaseForm.supplierName}
                  onChangeText={(supplierName) => setPurchaseForm((current) => ({ ...current, supplierName }))}
                  style={styles.input}
                  placeholder="Supplier name"
                  placeholderTextColor={MEATSHOP_COLORS.soft}
                />

                <Text style={styles.label}>Choose Product</Text>
                {loadingProducts ? <ActivityIndicator style={{ marginVertical: 8 }} color={MEATSHOP_COLORS.maroon} /> : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {products.map((product) => {
                    const active = purchaseForm.productId === product.id;
                    return (
                      <Pressable
                        key={product.id}
                        onPress={() =>
                          setPurchaseForm((current) => ({
                            ...current,
                            productId: product.id,
                            productName: product.name,
                          }))
                        }
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{product.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.row}>
                  <View style={styles.rowField}>
                    <Text style={styles.label}>Quantity (kg)</Text>
                    <TextInput
                      value={purchaseForm.quantity}
                      onChangeText={(quantity) => setPurchaseForm((current) => ({ ...current, quantity }))}
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={MEATSHOP_COLORS.soft}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rowField}>
                    <Text style={styles.label}>Cost</Text>
                    <TextInput
                      value={purchaseForm.cost}
                      onChangeText={(cost) => setPurchaseForm((current) => ({ ...current, cost }))}
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor={MEATSHOP_COLORS.soft}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Expiry (YYYY-MM-DD)</Text>
                <TextInput
                  value={purchaseForm.expiryDate}
                  onChangeText={(expiryDate) => setPurchaseForm((current) => ({ ...current, expiryDate }))}
                  style={styles.input}
                  placeholder="2027-12-31"
                  placeholderTextColor={MEATSHOP_COLORS.soft}
                />

                <Text style={styles.label}>Notes</Text>
                <TextInput
                  value={purchaseForm.notes}
                  onChangeText={(notes) => setPurchaseForm((current) => ({ ...current, notes }))}
                  style={[styles.input, styles.notesInput]}
                  placeholder="Delivery or receiving notes"
                  placeholderTextColor={MEATSHOP_COLORS.soft}
                  multiline
                />

                <View style={styles.actionRow}>
                  <Pressable onPress={savePurchase} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{selectedPurchaseId ? 'Update Order' : 'Save Order'}</Text>
                  </Pressable>
                  <Pressable onPress={clearPurchaseForm} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Clear</Text>
                  </Pressable>
                </View>
              </MeatshopSurfaceCard>

              <MeatshopSurfaceCard>
                <Text style={styles.cardTitle}>Purchase Orders</Text>
                {scopedPurchases.length === 0 ? (
                  <Text style={styles.emptyText}>No purchase orders yet.</Text>
                ) : (
                  scopedPurchases.map((purchase) => {
                    const selected = purchase.id === selectedPurchaseId;
                    return (
                      <View key={purchase.id} style={[styles.purchaseRow, selected && styles.listRowSelected]}>
                        <Pressable onPress={() => setSelectedPurchaseId(purchase.id)} style={styles.purchaseBody}>
                          <Text style={styles.listRowTitle}>{purchase.productName}</Text>
                          <Text style={styles.listRowMeta}>
                            {purchase.supplierName} | {purchase.quantity} kg | {purchase.status}
                          </Text>
                          {purchase.expiryDate ? <Text style={styles.listRowMeta}>Expiry: {purchase.expiryDate}</Text> : null}
                        </Pressable>
                        <View style={styles.purchaseActions}>
                          <Pressable
                            onPress={() => {
                              void receivePurchase(purchase);
                            }}
                            disabled={purchase.status === 'received' || receivingId === purchase.id}
                            style={[
                              styles.smallButton,
                              (purchase.status === 'received' || receivingId === purchase.id) && styles.disabledButton,
                            ]}
                          >
                            <Text style={styles.smallButtonText}>
                              {receivingId === purchase.id
                                ? 'Receiving...'
                                : purchase.status === 'received'
                                  ? 'Received'
                                  : 'Receive'}
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => deletePurchase(purchase.id)} style={[styles.smallButton, styles.smallDeleteButton]}>
                            <Text style={styles.smallDeleteButtonText}>Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
                )}
              </MeatshopSurfaceCard>
            </>
          )}
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    backgroundColor: MEATSHOP_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: MEATSHOP_COLORS.maroon,
    borderColor: MEATSHOP_COLORS.maroon,
  },
  tabButtonText: {
    color: MEATSHOP_COLORS.muted,
    fontWeight: '800',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  cardTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  label: {
    fontWeight: '800',
    color: MEATSHOP_COLORS.text,
    marginTop: 12,
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    ...MEATSHOP_INPUT,
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: 'top',
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
  disabledButton: {
    opacity: 0.55,
  },
  listRow: {
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
  },
  listRowSelected: {
    borderColor: MEATSHOP_COLORS.maroon,
    backgroundColor: '#FFF7F4',
  },
  listRowMain: {
    gap: 3,
  },
  listRowTitle: {
    fontWeight: '800',
    color: MEATSHOP_COLORS.text,
    fontSize: 15,
  },
  listRowMeta: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  listRowHint: {
    marginTop: 10,
    color: MEATSHOP_COLORS.maroon,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: MEATSHOP_COLORS.muted,
    marginTop: 6,
    lineHeight: 21,
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
  purchaseRow: {
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
  },
  purchaseBody: {
    marginBottom: 10,
  },
  purchaseActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
  smallDeleteButton: {
    backgroundColor: MEATSHOP_COLORS.dangerBg,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.dangerBorder,
  },
  smallDeleteButtonText: {
    color: MEATSHOP_COLORS.dangerText,
    fontWeight: '800',
    fontSize: 12,
  },
});
