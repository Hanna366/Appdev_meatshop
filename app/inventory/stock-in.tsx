import React, { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createStockIn,
  fetchBatchesByProduct,
  fetchInventoryByTenantWithProducts,
  stockInProduct,
} from '../../src/features/inventory/services/inventoryService';
import { useTenantStore } from '../../src/features/tenant/store/useTenantStore';
import { useAuthStore } from '../../src/features/auth/store/useAuthStore';
import { useInventoryStore } from '../../src/features/inventory/store/useInventoryStore';
import { fetchProductById } from '../../src/features/product/services/productService';

export default function StockInRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string }>();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const user = useAuthStore((state) => state.user);
  const [quantity, setQuantity] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cost, setCost] = useState('');
  const [product, setProduct] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!productId) {
        return;
      }

      const loadedProduct = await fetchProductById(String(productId)).catch(() => null);
      if (!mounted) {
        return;
      }

      setProduct(loadedProduct);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [productId]);

  async function submit() {
    if (!tenantId) {
      return Alert.alert('No tenant selected', 'Please select an active tenant before receiving stock.');
    }

    if (!productId) {
      return Alert.alert('No product selected', 'Open Stock In from an item or pass a productId.');
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return Alert.alert('Invalid quantity', 'Quantity must be a positive number.');
    }

    setSubmitting(true);
    try {
      const batches = await fetchBatchesByProduct(tenantId, String(productId));
      if (batches.length > 0) {
        await createStockIn({
          tenantId,
          productId: String(productId),
          quantity: qty,
          cost: cost ? Number(cost) : undefined,
          expiryDate: expiry || null,
          userId: user?.id,
          notes: 'stock-in via app',
        });
      } else {
        await stockInProduct({
          tenantId,
          productId: String(productId),
          quantity: qty,
          cost: cost ? Number(cost) : undefined,
          expiryDate: expiry || null,
          userId: user?.id,
          notes: 'stock-in via app',
        });
      }

      const summaries = await fetchInventoryByTenantWithProducts(tenantId);
      if (summaries.length === 0) {
        const inventoryService = await import('../../src/features/inventory/services/inventoryService');
        const fallbackSummaries = await inventoryService.fetchInventoryFromProducts(tenantId);
        useInventoryStore.getState().setSummaries(fallbackSummaries as any);
      } else {
        useInventoryStore.getState().setSummaries(summaries as any);
      }

      router.back();
    } catch (error: any) {
      Alert.alert('Failed', String(error?.message ?? error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Stock In' }} />
      <View style={styles.form}>
        <Text style={styles.label}>Product</Text>
        {productId ? (
          <Text style={styles.value}>{product?.name ?? String(productId)}</Text>
        ) : (
          <Pressable onPress={() => router.push('/inventory')} style={{ paddingVertical: 6 }}>
            <Text style={[styles.value, { color: '#7A1F1F' }]}>Select product</Text>
          </Pressable>
        )}
        {product?.unit ? <Text style={styles.meta}>{product.unit}</Text> : null}

        <Text style={styles.label}>Quantity</Text>
        <TextInput keyboardType="numeric" value={quantity} onChangeText={setQuantity} style={styles.input} />

        <Text style={styles.label}>Expiry (YYYY-MM-DD)</Text>
        <TextInput value={expiry} onChangeText={setExpiry} style={styles.input} />

        <Text style={styles.label}>Cost (optional)</Text>
        <TextInput keyboardType="numeric" value={cost} onChangeText={setCost} style={styles.input} />

        <Pressable
          style={[styles.button, (submitting || !productId) ? { opacity: 0.6 } : {}]}
          onPress={submit}
          disabled={submitting || !productId}
        >
          <Text style={styles.buttonText}>{submitting ? 'Receiving...' : 'Receive'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F3' },
  form: { padding: 16 },
  label: { fontWeight: '700', marginTop: 12 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5DED1', padding: 10, borderRadius: 8, marginTop: 6 },
  value: { marginTop: 6, color: '#1F1C17' },
  meta: { marginTop: 6, color: '#6A655B' },
  button: { marginTop: 18, backgroundColor: '#B23A1D', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: '700' },
});
