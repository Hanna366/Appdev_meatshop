import React, { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchBatchesByProduct, fetchInventoryTransactions } from '../../src/features/inventory/services/inventoryService';
import { useTenantStore } from '../../src/features/tenant/store/useTenantStore';
import { fetchProductById } from '../../src/features/product/services/productService';

export default function ProductInventoryDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string }>();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [product, setProduct] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!tenantId || !productId) {
        if (mounted) {
          setBatches([]);
          setTransactions([]);
          setProduct(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const [loadedBatches, loadedTransactions, loadedProduct] = await Promise.all([
          fetchBatchesByProduct(tenantId, String(productId)),
          fetchInventoryTransactions(tenantId, String(productId)),
          fetchProductById(String(productId)).catch(() => null),
        ]);

        if (!mounted) {
          return;
        }

        setBatches(loadedBatches);
        setTransactions(loadedTransactions);
        setProduct(loadedProduct);
      } catch (error) {
        console.warn('Failed to load product inventory detail', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [productId, tenantId]);

  if (!productId) {
    return null;
  }

  const lastStockIn = transactions.find((transaction) => transaction.type === 'stock_in');
  const lastStockOut = transactions.find((transaction) => transaction.type === 'stock_out');

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: product?.name ?? 'Product Inventory' }} />
      <View style={styles.header}>
        <Text style={styles.title}>{product?.name ?? String(productId)}</Text>
        <Text style={styles.subtitle}>{product?.unit ?? 'Unit not set'}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.button}
          onPress={() => router.push({ pathname: '/inventory/stock-in', params: { productId } })}
        >
          <Text style={styles.buttonText}>Stock In</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => router.push({ pathname: '/inventory/adjust', params: { productId } })}
        >
          <Text style={styles.buttonText}>Adjust</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => router.push({ pathname: '/inventory/waste', params: { productId } })}
        >
          <Text style={styles.buttonText}>Log Waste</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Open batches</Text>
        <Text style={styles.summaryValue}>{batches.length}</Text>
        <Text style={styles.summaryMeta}>
          Last stock in: {lastStockIn?.createdAt ? String(lastStockIn.createdAt) : 'None'}
        </Text>
        <Text style={styles.summaryMeta}>
          Last stock out: {lastStockOut?.createdAt ? String(lastStockOut.createdAt) : 'None'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => <Text style={styles.sectionTitle}>Batches</Text>}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No active batches found for this product.</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.productId}>{item.id}</Text>
                <Text style={styles.meta}>
                  Remaining: {item.remainingQuantity} - Expiry: {item.expiryDate ?? 'None'}
                </Text>
              </View>
              <View style={styles.batchActions}>
                <Pressable
                  style={styles.smallButton}
                  onPress={() =>
                    router.push({
                      pathname: '/inventory/waste',
                      params: { batchId: item.id, productId },
                    })
                  }
                >
                  <Text style={styles.smallButtonText}>Waste</Text>
                </Pressable>
                <Pressable
                  style={styles.smallButton}
                  onPress={() =>
                    router.push({
                      pathname: '/inventory/adjust',
                      params: { batchId: item.id, productId },
                    })
                  }
                >
                  <Text style={styles.smallButtonText}>Adjust</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <Pressable
          style={styles.historyButton}
          onPress={() => router.push({ pathname: '/inventory/transactions', params: { productId } })}
        >
          <Text style={styles.historyButtonText}>View Transaction History</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F3' },
  header: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1F1C17' },
  subtitle: { marginTop: 4, color: '#6A655B' },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  button: { padding: 8, backgroundColor: '#E9F2FF', borderRadius: 8, marginRight: 8 },
  buttonText: { color: '#2B4E86', fontWeight: '700' },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5DED1',
  },
  summaryLabel: { fontSize: 12, color: '#6A655B', textTransform: 'uppercase' },
  summaryValue: { fontSize: 28, fontWeight: '700', color: '#1F1C17', marginVertical: 4 },
  summaryMeta: { color: '#6A655B', marginTop: 2 },
  loader: { marginTop: 20 },
  sectionTitle: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, fontWeight: '700' },
  empty: { paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: '#6A655B' },
  row: {
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowContent: { flex: 1 },
  productId: { fontWeight: '700' },
  meta: { color: '#6A655B', marginTop: 4 },
  batchActions: { flexDirection: 'row', gap: 8 },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EEE',
    borderRadius: 6,
    marginLeft: 8,
  },
  smallButtonText: { fontWeight: '700', color: '#3B3B3B' },
  footer: { padding: 16 },
  historyButton: {
    backgroundColor: '#B23A1D',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  historyButtonText: { color: '#FFF', fontWeight: '700' },
});
