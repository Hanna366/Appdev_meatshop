import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInventoryStore } from '../store/useInventoryStore';
import { fetchInventoryByTenantWithProducts } from '../services/inventoryService';
import { useTenantStore } from '../../tenant/store/useTenantStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import firebaseConfig from '../../../config/firebaseConfig';

function SnapshotFallback({ tenantId, setSummaries }: { tenantId: string | null; setSummaries: (s: any[]) => void }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const snap = await import('../../../config/firestoreSnapshot.json').catch(() => null);
        if (!mounted) return;
        if (!snap || !snap.default) {
          setErr('No local snapshot found. Run `npm run export:snapshot` to create one, or configure Firebase client.');
        } else {
          // map snapshot products -> ProductInventorySummary shape
          const data = (snap as any).default;
          const products = data.products || [];
          const summaries = products.map((p: any) => ({
            productId: p.id,
            productName: p.name,
            tenantId: data.tenantId,
            totalQuantity: Number(p.stock ?? 0),
            batchesCount: (data.batches || []).filter((b: any) => b.productId === p.id).length,
            lowStock: false,
            nextExpiryDate: null,
            unit: p.unit ?? undefined,
          }));
          setSummaries(summaries as any[]);
        }
      } catch (e: any) {
        setErr(String(e?.message ?? e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [tenantId]);

  if (loading) return <View style={{ padding: 20 }}><ActivityIndicator /></View>;
  if (err) return <View style={{ padding: 20 }}><Text style={{ color: '#7C7464' }}>{err}</Text></View>;
  return null;
}

export default function InventoryListScreen() {
  const router = useRouter();
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const user = useAuthStore((s) => s.user);
  const summaries = useInventoryStore((s) => s.summaries);
  const setSummaries = useInventoryStore((s) => s.setSummaries);
  const loading = useInventoryStore((s) => s.loading);
  const setLoading = useInventoryStore((s) => s.setLoading);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!tenantId) return;
      // if firebase client is not configured, skip remote fetch to avoid errors
      if (!firebaseConfig || (firebaseConfig.apiKey ?? '').includes('YOUR_API_KEY')) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // try batch-based summaries first
        let data = await fetchInventoryByTenantWithProducts(tenantId);
        // if no batches/summaries, fallback to products collection as source of inventory
        if (!data || data.length === 0) {
          const fromProducts = await (await import('../services/inventoryService')).fetchInventoryFromProducts(tenantId);
          data = fromProducts as any;
        }
        if (!mounted) return;
        setSummaries(data as any);
      } catch (err) {
        console.warn('Failed to load inventory summaries', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Text style={styles.subtitle}>Tenant: {tenantId ?? '—'}</Text>
      </View>

      {/* If Firebase client is missing, SnapshotFallback will seed `useInventoryStore` from a local file. Render it (it returns null after setting data) */}
      {(!firebaseConfig || (firebaseConfig.apiKey ?? '').includes('YOUR_API_KEY')) && (
        <SnapshotFallback tenantId={tenantId} setSummaries={setSummaries} />
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(item) => item.productId}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/inventory/[productId]', params: { productId: item.productId } })}
              >
                <Text style={styles.product}>{item.productName ?? item.productId}</Text>
                <Text style={styles.meta}>{item.totalQuantity} {(item as any).unit ?? ''} • Batches: {item.batchesCount}</Text>
              </Pressable>

              <View style={styles.rowActions}>
                <Pressable style={styles.smallButton} onPress={() => router.push({ pathname: '/inventory/stock-in', params: { productId: item.productId } })}>
                  <Text style={styles.smallButtonText}>Stock In</Text>
                </Pressable>
                <Pressable style={styles.smallButton} onPress={() => router.push({ pathname: '/inventory/stock-out', params: { productId: item.productId } })}>
                  <Text style={styles.smallButtonText}>Stock Out</Text>
                </Pressable>
                <Pressable style={styles.smallButton} onPress={() => router.push({ pathname: '/inventory/adjust', params: { productId: item.productId } })}>
                  <Text style={styles.smallButtonText}>Adjust</Text>
                </Pressable>
                <Pressable style={styles.smallButton} onPress={() => router.push({ pathname: '/inventory/transactions', params: { productId: item.productId } })}>
                  <Text style={styles.smallButtonText}>History</Text>
                </Pressable>
              </View>

              {item.lowStock && <Text style={styles.low}>Low</Text>}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}><Text style={styles.emptyText}>No inventory records found.</Text></View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F3' },
  header: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { marginTop: 4, color: '#6A655B' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { padding: 14, borderBottomWidth: 1, borderColor: '#EEE', flexDirection: 'row', alignItems: 'center' },
  product: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#6A655B', marginTop: 4 },
  low: { color: '#A23821', fontWeight: '700' },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#726C60' },
  rowActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallButton: { paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#EEE', borderRadius: 8, marginLeft: 6 },
  smallButtonText: { fontWeight: '700', color: '#2B2B2B' },
});
