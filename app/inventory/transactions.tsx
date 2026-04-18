import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { fetchInventoryTransactions } from '../../src/features/inventory/services/inventoryService';
import { useRouter } from 'expo-router';
import { useTenantStore } from '../../src/features/tenant/store/useTenantStore';

export default function InventoryTransactionsRoute() {
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!tenantId) return;
      setLoading(true);
      try {
        const productId = (router as any).params?.productId;
        const r = await fetchInventoryTransactions(tenantId, productId ?? undefined);
        if (!mounted) return;
        setTxs(r);
      } catch (err) {
        console.warn('Failed to load inventory transactions', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [tenantId]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Inventory Transactions' }} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={txs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.type}>{item.type}</Text>
              <Text style={styles.meta}>{item.productId} • {item.quantity}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F3' },
  row: { padding: 14, borderBottomWidth: 1, borderColor: '#EEE' },
  type: { fontWeight: '700' },
  meta: { color: '#6A655B', marginTop: 6 },
});
