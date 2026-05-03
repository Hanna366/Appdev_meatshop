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

const PRIMARY = '#7A1F1F';
const BG = '#F6F6F3';
const CARD = '#FFFFFF';
const BORDER = '#E5DED1';
const TEXT = '#1F1C17';
const MUTED = '#6A655B';

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

  if (!canManageOperations) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blockedState}>
          <Text style={styles.blockedTitle}>Access Restricted</Text>
          <Text style={styles.blockedText}>
            Your current role cannot manage suppliers, customers, or purchase orders.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!operationsEntitlement.allowed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.blockedState}>
          <LockedFeatureNotice
            title="Operations Locked"
            message={operationsEntitlement.message ?? 'Upgrade your plan to manage store operations.'}
            requiredPlan={operationsEntitlement.requiredPlan}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Store Operations</Text>
          <Text style={styles.subtitle}>
            Manage suppliers, customers, and purchase receiving for your meat shop.
          </Text>
        </View>

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
                <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab !== 'purchases' ? (
          <>
            {!(
              activeTab === 'suppliers' ? supplierEntitlement.allowed : customerEntitlement.allowed
            ) ? (
              <LockedFeatureNotice
                title={`${activeTab === 'suppliers' ? 'Supplier' : 'Customer'} Tools Locked`}
                message="This plan does not include contact management."
                requiredPlan={
                  activeTab === 'suppliers'
                    ? supplierEntitlement.requiredPlan
                    : customerEntitlement.requiredPlan
                }
              />
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {selectedContactId
                      ? 'Edit Contact'
                      : `Add ${activeTab === 'suppliers' ? 'Supplier' : 'Customer'}`}
                  </Text>

                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    value={contactForm.name}
                    onChangeText={(name) => setContactForm((current) => ({ ...current, name }))}
                    style={styles.input}
                    placeholder="Enter contact name"
                    placeholderTextColor="#8A8A8A"
                  />

                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    value={contactForm.phone}
                    onChangeText={(phone) => setContactForm((current) => ({ ...current, phone }))}
                    style={styles.input}
                    placeholder="Contact number"
                    placeholderTextColor="#8A8A8A"
                  />

                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    value={contactForm.email}
                    onChangeText={(email) => setContactForm((current) => ({ ...current, email }))}
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#8A8A8A"
                    autoCapitalize="none"
                  />

                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    value={contactForm.notes}
                    onChangeText={(notes) => setContactForm((current) => ({ ...current, notes }))}
                    style={[styles.input, styles.notesInput]}
                    placeholder="Special notes"
                    placeholderTextColor="#8A8A8A"
                    multiline
                  />

                  <View style={styles.actionRow}>
                    <Pressable onPress={saveContact} style={styles.primaryButton}>
                      <Text style={styles.primaryButtonText}>
                        {selectedContactId ? 'Update Contact' : 'Save Contact'}
                      </Text>
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
                </View>

                <View style={styles.card}>
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
                </View>
              </>
            )}
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {selectedPurchaseId ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </Text>

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
                onChangeText={(supplierName) =>
                  setPurchaseForm((current) => ({ ...current, supplierName }))
                }
                style={styles.input}
                placeholder="Supplier name"
                placeholderTextColor="#8A8A8A"
              />

              <Text style={styles.label}>Choose Product</Text>
              {loadingProducts ? <ActivityIndicator style={{ marginVertical: 8 }} /> : null}
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
                    placeholderTextColor="#8A8A8A"
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
                    placeholderTextColor="#8A8A8A"
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
                placeholderTextColor="#8A8A8A"
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                value={purchaseForm.notes}
                onChangeText={(notes) => setPurchaseForm((current) => ({ ...current, notes }))}
                style={[styles.input, styles.notesInput]}
                placeholder="Delivery or receiving notes"
                placeholderTextColor="#8A8A8A"
                multiline
              />

              <View style={styles.actionRow}>
                <Pressable onPress={savePurchase} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>
                    {selectedPurchaseId ? 'Update Order' : 'Save Order'}
                  </Text>
                </Pressable>
                <Pressable onPress={clearPurchaseForm} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Clear</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
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
                        {purchase.expiryDate ? (
                          <Text style={styles.listRowMeta}>Expiry: {purchase.expiryDate}</Text>
                        ) : null}
                      </Pressable>
                      <View style={styles.purchaseActions}>
                        <Pressable
                          onPress={() => {
                            void receivePurchase(purchase);
                          }}
                          disabled={purchase.status === 'received' || receivingId === purchase.id}
                          style={[
                            styles.smallButton,
                            (purchase.status === 'received' || receivingId === purchase.id) &&
                              styles.disabledButton,
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
                        <Pressable
                          onPress={() => deletePurchase(purchase.id)}
                          style={[styles.smallButton, styles.smallDeleteButton]}
                        >
                          <Text style={styles.smallDeleteButtonText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  tabButtonText: {
    color: MUTED,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
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
  label: {
    fontWeight: '700',
    color: TEXT,
    marginTop: 10,
    marginBottom: 6,
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
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top',
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
  disabledButton: {
    opacity: 0.55,
  },
  listRow: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
  },
  listRowSelected: {
    borderColor: PRIMARY,
    backgroundColor: '#FFF7F4',
  },
  listRowMain: {
    gap: 3,
  },
  listRowTitle: {
    fontWeight: '700',
    color: TEXT,
  },
  listRowMeta: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  listRowHint: {
    marginTop: 8,
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: MUTED,
    marginTop: 6,
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
  purchaseRow: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
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
  smallDeleteButton: {
    backgroundColor: '#FFF1EC',
    borderWidth: 1,
    borderColor: '#F2D2C6',
  },
  smallDeleteButtonText: {
    color: '#A23821',
    fontWeight: '700',
    fontSize: 12,
  },
});
