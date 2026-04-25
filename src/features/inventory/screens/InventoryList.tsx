import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInventoryStore } from '../store/useInventoryStore';
import { fetchInventoryByTenantWithProducts } from '../services/inventoryService';
import { useTenantStore } from '../../tenant/store/useTenantStore';
import firebaseConfig from '../../../config/firebaseConfig';
import { InventoryStatCard, InventorySearchBar, InventoryItemCard, FloatingAddButton } from '../components/InventoryUI';

function SnapshotFallback({
  tenantId,
  setSummaries,
}: {
  tenantId: string | null;
  setSummaries: (summaries: any[]) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const snap = await import('../../../config/firestoreSnapshot.json').catch(() => null);
        if (!mounted) {
          return;
        }

        if (!snap || !snap.default) {
          setErr('No local snapshot found. Run `npm run export:snapshot` or configure Firebase.');
          return;
        }

        const data = (snap as any).default;
        const products = data.products || [];
        const summaries = products.map((product: any) => ({
          productId: product.id,
          productName: product.name,
          tenantId: data.tenantId,
          totalQuantity: Number(product.stock ?? 0),
          batchesCount: (data.batches || []).filter((batch: any) => batch.productId === product.id).length,
          lowStock: false,
          nextExpiryDate: null,
          unit: product.unit ?? undefined,
        }));

        setSummaries(summaries);
      } catch (error: any) {
        setErr(String(error?.message ?? error));
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
  }, [tenantId, setSummaries]);

  if (loading) {
    return (
      <View style={styles.feedbackBlock}>
        <ActivityIndicator />
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.feedbackBlock}>
        <Text style={styles.feedbackText}>{err}</Text>
      </View>
    );
  }

  return null;
}

export default function InventoryListScreen() {
  const router = useRouter();
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const summaries = useInventoryStore((state) => state.summaries);
  const setSummaries = useInventoryStore((state) => state.setSummaries);
  const loading = useInventoryStore((state) => state.loading);
  const setLoading = useInventoryStore((state) => state.setLoading);
  const [q, setQ] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      if (!firebaseConfig || (firebaseConfig.apiKey ?? '').includes('YOUR_API_KEY')) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let data = await fetchInventoryByTenantWithProducts(tenantId);
        if (!data || data.length === 0) {
          const inventoryService = await import('../services/inventoryService');
          data = (await inventoryService.fetchInventoryFromProducts(tenantId)) as any;
        }

        if (!mounted) {
          return;
        }

        setSummaries(data as any);
      } catch (error) {
        console.warn('Failed to load inventory summaries', error);
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
  }, [setLoading, setSummaries, tenantId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => {}} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 20 }}>☰</Text>
          </Pressable>
          <View>
            <Text style={styles.title}>Inventory</Text>
            <Text style={styles.subtitle}>Tenant: {tenantId ?? '—'}</Text>
          </View>
        </View>
        <Pressable onPress={() => {}}>
          <Text style={{ fontSize: 20 }}>🔔</Text>
        </Pressable>
      </View>

      {(!firebaseConfig || (firebaseConfig.apiKey ?? '').includes('YOUR_API_KEY')) && (
        <SnapshotFallback tenantId={tenantId} setSummaries={setSummaries as any} />
      )}

      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <InventoryStatCard title="Total Items" value={summaries?.length ?? 0} subtitle="All items" />
          <InventoryStatCard title="Low Stock" value={summaries?.filter((s: any) => s.lowStock).length ?? 0} subtitle="Need attention" />
          <InventoryStatCard title="Out of Stock" value={summaries?.filter((s: any) => (s.totalQuantity ?? 0) <= 0).length ?? 0} subtitle="Out of stock" />
        </View>

        <InventorySearchBar value={q} onChange={setQ} onFilter={() => {}} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(item) => item.productId}
          renderItem={({ item }) => {
            if (q && !String(item.productName ?? item.productId).toLowerCase().includes(q.toLowerCase())) return null;
            return (
              <InventoryItemCard
                summary={item}
                onPress={() => router.push(`/inventory/${item.productId}`)}
                onAction={(a) => {
                  if (a === 'in') router.push(`/inventory/stock-in?productId=${encodeURIComponent(item.productId)}`);
                  if (a === 'out') router.push(`/inventory/stock-out?productId=${encodeURIComponent(item.productId)}`);
                  if (a === 'adjust') router.push(`/inventory/adjust?productId=${encodeURIComponent(item.productId)}`);
                  if (a === 'history') router.push(`/inventory/transactions?productId=${encodeURIComponent(item.productId)}`);
                }}
              />
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No inventory records found.</Text>
            </View>
          )}
        />
      )}

      <FloatingAddButton onPress={() => router.push('/inventory/stock-in')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F3' },
  header: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { marginTop: 4, color: '#6A655B' },
  feedbackBlock: { padding: 20 },
  feedbackText: { color: '#7C7464' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { padding: 14, borderBottomWidth: 1, borderColor: '#EEE', flexDirection: 'row', alignItems: 'center' },
  rowMain: { flex: 1 },
  product: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#6A655B', marginTop: 4 },
  low: { color: '#A23821', fontWeight: '700' },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#726C60' },
  rowActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallButton: { paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#EEE', borderRadius: 8, marginLeft: 6 },
  smallButtonText: { fontWeight: '700', color: '#2B2B2B' },
});
