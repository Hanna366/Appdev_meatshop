import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { createStockIn, stockInProduct, fetchInventoryByTenantWithProducts, fetchBatchesByProduct } from '../../src/features/inventory/services/inventoryService';
import { useTenantStore } from '../../src/features/tenant/store/useTenantStore';
import { useAuthStore } from '../../src/features/auth/store/useAuthStore';
import { useInventoryStore } from '../../src/features/inventory/store/useInventoryStore';
import { fetchProductById } from '../../src/features/product/services/productService';
import { useEffect, useState } from 'react';

export default function StockInRoute() {
  const router = useRouter();
  const productId = (router as any).params?.productId;
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const user = useAuthStore((s) => s.user);
  const [quantity, setQuantity] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cost, setCost] = useState('');
  const [product, setProduct] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!productId) return;
      const p = await fetchProductById(String(productId));
      if (!mounted) return;
      setProduct(p);
    }
    load();
    return () => { mounted = false; };
  }, [productId]);

  async function submit() {
    if (!tenantId || !productId) return;
    const qty = Number(quantity);
    if (!qty || qty <= 0) return Alert.alert('Invalid quantity');
    try {
      // Decide: if there are already batches for this product, create a batch (and update product.stock);
      // otherwise update product.stock and record a transaction.
      const batches = await fetchBatchesByProduct(tenantId, String(productId));
      if (batches && batches.length > 0) {
        await createStockIn({ tenantId, productId: String(productId), quantity: qty, cost: cost ? Number(cost) : undefined, expiryDate: expiry || null, userId: user?.id, notes: 'stock-in via app' });
      } else {
        await stockInProduct({ tenantId, productId: String(productId), quantity: qty, cost: cost ? Number(cost) : undefined, expiryDate: expiry || null, userId: user?.id, notes: 'stock-in via app' });
      }

      // refresh inventory list in-place
      const summaries = await fetchInventoryByTenantWithProducts(tenantId);
      // if still empty, fallback to products
      if (!summaries || summaries.length === 0) {
        const fromProducts = await (await import('../../src/features/inventory/services/inventoryService')).fetchInventoryFromProducts(tenantId);
        useInventoryStore.getState().setSummaries(fromProducts as any);
      } else {
        useInventoryStore.getState().setSummaries(summaries as any);
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Failed', String(err?.message ?? err));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Stock In' }} />
      <View style={styles.form}>
        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>{product?.name ?? String(productId)}</Text>
        {product?.unit && <Text style={[styles.meta, { marginTop: 6 }]}>{product.unit}</Text>}

        <Text style={styles.label}>Quantity</Text>
        <TextInput keyboardType="numeric" value={quantity} onChangeText={setQuantity} style={styles.input} />

        <Text style={styles.label}>Expiry (YYYY-MM-DD)</Text>
        <TextInput value={expiry} onChangeText={setExpiry} style={styles.input} />

        <Text style={styles.label}>Cost (optional)</Text>
        <TextInput keyboardType="numeric" value={cost} onChangeText={setCost} style={styles.input} />

        <Pressable style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>Receive</Text>
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
  button: { marginTop: 18, backgroundColor: '#B23A1D', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: '700' },
  meta: { color: '#6A655B' },
});
