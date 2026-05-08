import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  MEATSHOP_CARD_SHADOW,
  MEATSHOP_COLORS,
  MEATSHOP_INPUT,
  MEATSHOP_PILL,
  MeatshopBottomTabBar,
  MeatshopPageHero,
  MeatshopSectionHeader,
  MeatshopShell,
  MeatshopSurfaceCard,
} from '../../../components/ui/MeatshopChrome';
import { useInventoryStore } from '../store/useInventoryStore';
import { fetchInventoryByTenantWithProducts } from '../services/inventoryService';
import { useTenantStore } from '../../tenant/store/useTenantStore';
import firebaseConfig from '../../../config/firebaseConfig';

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
        if (!mounted) return;

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
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [tenantId, setSummaries]);

  if (loading) {
    return (
      <MeatshopSurfaceCard>
        <View style={styles.feedbackRow}>
          <ActivityIndicator color={MEATSHOP_COLORS.maroon} />
          <Text style={styles.feedbackText}>Loading fallback inventory snapshot...</Text>
        </View>
      </MeatshopSurfaceCard>
    );
  }

  if (err) {
    return (
      <MeatshopSurfaceCard>
        <Text style={styles.feedbackText}>{err}</Text>
      </MeatshopSurfaceCard>
    );
  }

  return null;
}

function StatCard({
  icon,
  value,
  label,
  bubbleColor,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  bubbleColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statBubble, { backgroundColor: bubbleColor }]}>{icon}</View>
      <View style={styles.statCopy}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function InventoryItemCard({ summary, onAction }: { summary: any; onAction: (action: string) => void }) {
  const shortName = (summary.productName || summary.productId || '').substring(0, 2).toUpperCase();
  const quantity = Number(summary.totalQuantity ?? 0);
  const isOut = quantity <= 0;
  const isLow = Boolean(summary.lowStock) && !isOut;

  const statusLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
  const statusStyle = isOut
    ? styles.statusPillDanger
    : isLow
      ? styles.statusPillWarning
      : styles.statusPillSuccess;
  const statusTextStyle = isOut
    ? styles.statusTextDanger
    : isLow
      ? styles.statusTextWarning
      : styles.statusTextSuccess;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemTopRow}>
        <View style={styles.itemAvatar}>
          <Text style={styles.itemAvatarText}>{shortName}</Text>
        </View>

        <View style={styles.itemMain}>
          <Text style={styles.itemName}>{summary.productName || summary.productId}</Text>
          <View style={styles.itemMetaRow}>
            <View style={styles.itemPill}>
              <Text style={styles.itemPillText}>Fresh</Text>
            </View>
            <View style={styles.itemPill}>
              <Text style={styles.itemPillText}>Meat</Text>
            </View>
          </View>
          <Text style={styles.itemMetaText}>
            {quantity} {summary.unit ?? 'kg'} • Batches: {summary.batchesCount ?? 0}
          </Text>
        </View>

        <View style={[styles.statusPill, statusStyle]}>
          <Text style={[styles.statusText, statusTextStyle]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.itemActions}>
        <Pressable style={styles.itemActionButton} onPress={() => onAction('in')}>
          <Text style={styles.itemActionText}>Stock In</Text>
        </Pressable>
        <Pressable style={styles.itemActionButton} onPress={() => onAction('out')}>
          <Text style={styles.itemActionText}>Stock Out</Text>
        </Pressable>
        <Pressable style={styles.itemActionButton} onPress={() => onAction('adjust')}>
          <Text style={styles.itemActionText}>Adjust</Text>
        </Pressable>
        <Pressable style={styles.itemActionButton} onPress={() => onAction('history')}>
          <Text style={styles.itemActionText}>History</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function InventoryListScreen() {
  const router = useRouter();
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const summaries = useInventoryStore((state) => state.summaries);
  const setSummaries = useInventoryStore((state) => state.setSummaries);
  const loading = useInventoryStore((state) => state.loading);
  const setLoading = useInventoryStore((state) => state.setLoading);
  const [query, setQuery] = useState('');

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
        if (!mounted) return;
        setSummaries(data as any);
      } catch (error) {
        console.warn('Failed to load inventory summaries', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [setLoading, setSummaries, tenantId]);

  const filteredSummaries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return summaries.filter((item) =>
      normalized.length === 0
        ? true
        : String(item.productName ?? item.productId).toLowerCase().includes(normalized),
    );
  }, [query, summaries]);

  const lowStockCount = summaries.filter((item: any) => item.lowStock).length;
  const outOfStockCount = summaries.filter((item: any) => Number(item.totalQuantity ?? 0) <= 0).length;
  const isUsingFallback = !firebaseConfig || (firebaseConfig.apiKey ?? '').includes('YOUR_API_KEY');

  const listHeader = (
    <View style={styles.headerContent}>
      <MeatshopPageHero
        eyebrow="Inventory"
        title="Inventory"
        subtitle="Track stock health, adjust quantities, and jump into inventory actions using the same visual language as the dashboard."
      >
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaPill}>
            <MaterialCommunityIcons name="storefront-outline" size={16} color={MEATSHOP_COLORS.maroon} />
            <Text style={styles.heroMetaText}>{tenantId ?? 'No tenant selected'}</Text>
          </View>
        </View>
      </MeatshopPageHero>

      {isUsingFallback ? (
        <SnapshotFallback tenantId={tenantId} setSummaries={setSummaries as any} />
      ) : null}

      <MeatshopSectionHeader
        title="Overview"
        icon={<Feather name="bar-chart-2" size={18} color={MEATSHOP_COLORS.maroon} />}
      />

      <View style={styles.statsGrid}>
        <StatCard
          icon={<MaterialCommunityIcons name="package-variant-closed" size={28} color={MEATSHOP_COLORS.maroon} />}
          value={String(summaries.length)}
          label="Total Items"
          bubbleColor={MEATSHOP_COLORS.roseTint}
        />
        <StatCard
          icon={<MaterialCommunityIcons name="alert-outline" size={28} color={MEATSHOP_COLORS.gold} />}
          value={String(lowStockCount)}
          label="Low Stock"
          bubbleColor={MEATSHOP_COLORS.sandTint}
        />
        <StatCard
          icon={<MaterialCommunityIcons name="close-octagon-outline" size={28} color={MEATSHOP_COLORS.maroon} />}
          value={String(outOfStockCount)}
          label="Out of Stock"
          bubbleColor={MEATSHOP_COLORS.roseTint}
        />
      </View>

      <MeatshopSectionHeader
        title="Find Items"
        icon={<Feather name="search" size={18} color={MEATSHOP_COLORS.maroon} />}
      />

      <MeatshopSurfaceCard style={styles.searchCard}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search meat or category..."
          placeholderTextColor={MEATSHOP_COLORS.soft}
          value={query}
          onChangeText={setQuery}
        />
        <Text style={styles.resultsMeta}>
          Showing {filteredSummaries.length} of {summaries.length} items
        </Text>
      </MeatshopSurfaceCard>
    </View>
  );

  return (
    <MeatshopShell>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Inventory</Text>
      </View>
      <View style={styles.topDivider} />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={MEATSHOP_COLORS.maroon} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={filteredSummaries}
          keyExtractor={(item) => item.productId}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          renderItem={({ item }) => (
            <InventoryItemCard
              summary={item}
              onAction={(action) => {
                if (action === 'in') router.push(`/inventory/stock-in?productId=${encodeURIComponent(item.productId)}`);
                if (action === 'out') router.push(`/inventory/stock-out?productId=${encodeURIComponent(item.productId)}`);
                if (action === 'adjust') router.push(`/inventory/adjust?productId=${encodeURIComponent(item.productId)}`);
                if (action === 'history') router.push(`/inventory/transactions?productId=${encodeURIComponent(item.productId)}`);
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No inventory records found.</Text>
            </View>
          }
          ListFooterComponent={
            <Pressable style={styles.addItemButton} onPress={() => router.push('/products')}>
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#FFFFFF" />
              <Text style={styles.addItemButtonText}>Add New Item</Text>
            </Pressable>
          }
        />
      )}

      <MeatshopBottomTabBar
        active="inventory"
        onDashboard={() => router.push('/dashboard')}
        onPlans={() => router.push('/plans')}
        onInventory={() => router.push('/inventory')}
        onReports={() => router.push('/reports')}
      />
    </MeatshopShell>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 66,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  topDivider: {
    height: 1,
    backgroundColor: '#E8DDD2',
  },
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
  },
  headerContent: {
    gap: 20,
    marginBottom: 20,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedbackText: {
    color: MEATSHOP_COLORS.muted,
    lineHeight: 21,
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
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: MEATSHOP_COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...MEATSHOP_CARD_SHADOW,
  },
  statBubble: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCopy: {
    flex: 1,
  },
  statValue: {
    color: MEATSHOP_COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  searchCard: {
    gap: 10,
  },
  searchInput: {
    ...MEATSHOP_INPUT,
  },
  resultsMeta: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 13,
  },
  itemSeparator: {
    height: 12,
  },
  itemCard: {
    backgroundColor: MEATSHOP_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    padding: 18,
    ...MEATSHOP_CARD_SHADOW,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  itemAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemAvatarText: {
    color: MEATSHOP_COLORS.maroonDark,
    fontWeight: '900',
    fontSize: 18,
  },
  itemMain: {
    flex: 1,
  },
  itemName: {
    color: MEATSHOP_COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  itemMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  itemPill: {
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  itemPillText: {
    color: MEATSHOP_COLORS.maroonDark,
    fontSize: 11,
    fontWeight: '700',
  },
  itemMetaText: {
    marginTop: 8,
    color: MEATSHOP_COLORS.muted,
    fontSize: 13,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  statusPillSuccess: {
    backgroundColor: MEATSHOP_COLORS.successBg,
    borderColor: '#CFE7D7',
  },
  statusPillWarning: {
    backgroundColor: '#FFF6E7',
    borderColor: '#F2D9A6',
  },
  statusPillDanger: {
    backgroundColor: MEATSHOP_COLORS.dangerBg,
    borderColor: MEATSHOP_COLORS.dangerBorder,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusTextSuccess: {
    color: MEATSHOP_COLORS.successText,
  },
  statusTextWarning: {
    color: '#B97909',
  },
  statusTextDanger: {
    color: MEATSHOP_COLORS.dangerText,
  },
  itemActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  itemActionButton: {
    ...MEATSHOP_PILL,
    paddingVertical: 8,
  },
  itemActionText: {
    color: MEATSHOP_COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 15,
  },
  addItemButton: {
    marginTop: 20,
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: MEATSHOP_COLORS.maroonDark,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addItemButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
