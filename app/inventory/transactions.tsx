import React, { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchInventoryTransactions } from '../../src/features/inventory/services/inventoryService';
import { useTenantStore } from '../../src/features/tenant/store/useTenantStore';

export default function InventoryTransactionsRoute() {
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const params = useLocalSearchParams<{ productId?: string }>();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!tenantId) {
        if (mounted) {
          setTransactions([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const loadedTransactions = await fetchInventoryTransactions(tenantId, productId ?? undefined);
        if (!mounted) {
          return;
        }

        setTransactions(loadedTransactions);
      } catch (error) {
        console.warn('Failed to load inventory transactions', error);
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

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: productId ? 'Product Transactions' : 'Inventory Transactions' }} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.type}>{item.type}</Text>
              <Text style={styles.meta}>{item.productId} - {item.quantity}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F3' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { padding: 14, borderBottomWidth: 1, borderColor: '#EEE' },
  type: { fontWeight: '700' },
  meta: { color: '#6A655B', marginTop: 6 },
});
