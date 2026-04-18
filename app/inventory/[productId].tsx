import React, { useEffect, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchBatchesByProduct, fetchInventoryTransactions } from '../../src/features/inventory/services/inventoryService';
import { useAuthStore } from '../../src/features/auth/store/useAuthStore';
import { useTenantStore } from '../../src/features/tenant/store/useTenantStore';

export default function ProductInventoryDetailRoute() {
  const router = useRouter();
  const productId = (router as any).params?.productId;
  const user = useAuthStore((s) => s.user);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!productId) return;
      setLoading(true);
        try {
          const tenantId = useTenantStore.getState().activeTenantId;
          if (!tenantId) throw new Error('no tenant selected');
          const b = await fetchBatchesByProduct(tenantId, String(productId));
          const tx = await fetchInventoryTransactions(tenantId, String(productId));
          if (!mounted) return;
          setBatches(b);
          setTransactions(tx);
        } catch (err) {
          console.warn('Failed to load product inventory detail', err);
        } finally {
          if (mounted) setLoading(false);
        }
    }
    load();
    return () => { mounted = false; };
  }, [productId]);

  if (!productId) return null;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: `Inventory: ${String(productId)}` }} />
      <View style={styles.header}>
        <Text style={styles.title}>Product Inventory</Text>
        <Text style={styles.subtitle}>{String(productId)}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={() => router.push({ pathname: '/inventory/stock-in', params: { productId } })}>
          <Text style={styles.buttonText}>Stock In</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => router.push({ pathname: '/inventory/adjust', params: { productId } })}>
          <Text style={styles.buttonText}>Adjust</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => router.push({ pathname: '/inventory/waste', params: { productId } })}>
          <Text style={styles.buttonText}>Log Waste</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => <Text style={styles.sectionTitle}>Batches</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.product}>{item.id}</Text>
                <Text style={styles.meta}>Remaining: {item.remainingQuantity} • Expiry: {item.expiryDate ?? '—'}</Text>
              </View>
              <View style={styles.batchActions}>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => router.push({ pathname: '/inventory/waste', params: { productId, batchId: item.id } })}
                >
                  <Text style={styles.smallButtonText}>Waste</Text>
                </Pressable>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => router.push({ pathname: '/inventory/adjust', params: { productId, batchId: item.id } })}
                >
                  <Text style={styles.smallButtonText}>Adjust</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F3' },
  header: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#6A655B', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  button: { padding: 8, backgroundColor: '#E9F2FF', borderRadius: 8, marginRight: 8 },
  buttonText: { color: '#2B4E86', fontWeight: '700' },
  sectionTitle: { paddingHorizontal: 16, paddingTop: 8, fontWeight: '700' },
  row: { padding: 14, borderBottomWidth: 1, borderColor: '#EEE', flexDirection: 'row', alignItems: 'center' },
  product: { fontWeight: '700' },
  meta: { color: '#6A655B', marginTop: 4 },
  batchActions: { flexDirection: 'row', gap: 8 },
  smallButton: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EEE', borderRadius: 6, marginLeft: 8 },
  smallButtonText: { fontWeight: '700', color: '#3B3B3B' },
});
