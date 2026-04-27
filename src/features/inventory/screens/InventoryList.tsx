import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useInventoryStore } from '../store/useInventoryStore';
import { fetchInventoryByTenantWithProducts } from '../services/inventoryService';
import { useTenantStore } from '../../tenant/store/useTenantStore';
import firebaseConfig from '../../../config/firebaseConfig';
import { FloatingAddButton } from '../components/InventoryUI';

const MAROON = '#6B1A2A';
const MAROON_DARK = '#5A1220';
const CREAM = '#F2EDE4';
const CARD = '#FFFFFF';
const BORDER = '#E8DDD2';
const TEXT_DARK = '#1A1411';
const TEXT_MID = '#7A7061';
const TEXT_LIGHT = '#9A8A78';

function SnapshotFallback({ tenantId, setSummaries }: { tenantId: string | null; setSummaries: (s: any[]) => void; }) {
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
    load();
    return () => { mounted = false; };
  }, [tenantId, setSummaries]);

  if (loading) return <View style={styles.feedbackBlock}><ActivityIndicator /></View>;
  if (err) return <View style={styles.feedbackBlock}><Text style={styles.feedbackText}>{err}</Text></View>;
  return null;
}

// ── Components ─────────────────────────────────────────────────────────────────

function Header({ tenantId, onBack }: { tenantId: string | null; onBack: () => void }) {
  return (
    <View style={headerStyles.header}>
      <Pressable style={headerStyles.headerBtn} onPress={onBack}>
        <Text style={headerStyles.hamburger}>☰</Text>
      </Pressable>

      <View style={headerStyles.headerLogoBlock}>
        <Text style={headerStyles.headerTitle}>Inventory</Text>
      </View>

      <Pressable style={headerStyles.headerBtn}>
        <Text style={headerStyles.bellIcon}>🔔</Text>
      </Pressable>
    </View>
  );
}

function PageHeaderTitle({ tenantId }: { tenantId: string | null }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderLeft}>
        <Image source={require('../../../../assets/logo.png')} style={styles.pageHeaderLogo} resizeMode="contain" />
      </View>
      <View style={styles.pageHeaderTextWrap}>
        <Text style={styles.pageTitle}>MEATSHOP</Text>
        <Text style={styles.pageSubtitle}>PREMIUM QUALITY MEATS</Text>
      </View>
      <Text style={styles.tenantMeta}>Tenant: {tenantId ?? '—'}</Text>
    </View>
  );
}

function StatCard({ icon, value, label, sublabel, type }: { icon: string; value: string; label: string; sublabel: string; type: 'default'|'warning'|'danger' }) {
  const iconBg = type === 'warning' ? MAROON : type === 'danger' ? MAROON_DARK : MAROON_DARK;
  return (
    <View style={cardStyles.statCard}>
      <View style={[cardStyles.statIconCircle, { backgroundColor: iconBg }]}>
        <Text style={cardStyles.statIconText}>{icon}</Text>
      </View>
      <View style={cardStyles.statTextWrap}>
        <View style={cardStyles.statValueRow}>
          <Text style={cardStyles.statValue}>{value}</Text>
        </View>
        <Text style={cardStyles.statLabel}>{label}</Text>
        <Text style={cardStyles.statSublabel}>{sublabel}</Text>
      </View>
    </View>
  );
}

function SearchBar({ value, onChange, onFilter }: { value: string; onChange: (v: string) => void; onFilter: () => void }) {
  return (
    <View style={searchStyles.container}>
      <View style={searchStyles.inputWrap}>
        <Text style={searchStyles.searchIcon}>🔍</Text>
        <TextInput
          style={searchStyles.input}
          placeholder="Search meat or category..."
          placeholderTextColor={TEXT_LIGHT}
          value={value}
          onChangeText={onChange}
        />
      </View>
      <Pressable style={searchStyles.filterBtn} onPress={onFilter}>
        <Text style={searchStyles.filterBtnText}>Filter ≑</Text>
      </Pressable>
    </View>
  );
}

function ItemCard({ summary, onAction }: { summary: any; onAction: (a: string) => void }) {
  const shortName = (summary.productName || summary.productId || '').substring(0, 2).toUpperCase();
  const inStock = (summary.totalQuantity ?? 0) > 0;
  
  return (
    <View style={itemStyles.card}>
      <View style={itemStyles.topRow}>
        <View style={itemStyles.avatarWrap}>
          <Text style={itemStyles.avatarText}>{shortName}</Text>
        </View>
        
        <View style={itemStyles.infoWrap}>
          <Text style={itemStyles.name}>{summary.productName || summary.productId}</Text>
          <View style={itemStyles.tagRow}>
            <View style={itemStyles.tag}><Text style={itemStyles.tagText}>Fresh</Text></View>
            <View style={itemStyles.tag}><Text style={itemStyles.tagText}>Meat</Text></View>
          </View>
          <Text style={itemStyles.metaText}>
            {summary.totalQuantity ?? 0} {summary.unit ?? 'kg'} • Batches: {summary.batchesCount ?? 0}
          </Text>
        </View>

        <View style={[itemStyles.statusPill, inStock ? itemStyles.statusPillIn : itemStyles.statusPillOut]}>
          <View style={[itemStyles.statusDot, inStock ? itemStyles.statusDotIn : itemStyles.statusDotOut]} />
          <Text style={[itemStyles.statusText, inStock ? itemStyles.statusTextIn : itemStyles.statusTextOut]}>
            {inStock ? 'In Stock' : 'Out'}
          </Text>
        </View>
      </View>

      <View style={itemStyles.actionRow}>
        <Pressable style={itemStyles.actionBtn} onPress={() => onAction('in')}>
          <Text style={itemStyles.actionBtnText}>Stock In</Text>
        </Pressable>
        <Pressable style={itemStyles.actionBtn} onPress={() => onAction('out')}>
          <Text style={itemStyles.actionBtnText}>Stock Out</Text>
        </Pressable>
        <Pressable style={itemStyles.actionBtn} onPress={() => onAction('adjust')}>
          <Text style={itemStyles.actionBtnText}>Adjust</Text>
        </Pressable>
        <Pressable style={itemStyles.actionBtn} onPress={() => onAction('history')}>
          <Text style={itemStyles.actionBtnText}>History</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BottomTabBar({ onDashboard, onPlans, onReports }: { onDashboard: () => void; onPlans: () => void; onReports: () => void; }) {
  return (
    <View style={tabStyles.tabBar}>
      <Pressable style={tabStyles.tab} onPress={onDashboard}>
        <Text style={tabStyles.tabIcon}>⌂</Text>
        <Text style={tabStyles.tabLabel}>Dashboard</Text>
      </Pressable>
      <Pressable style={tabStyles.tab} onPress={onPlans}>
        <Text style={tabStyles.tabIcon}>📋</Text>
        <Text style={tabStyles.tabLabel}>Plans</Text>
      </Pressable>
      <View style={[tabStyles.tab, tabStyles.tabActive]}>
        <Text style={tabStyles.tabIconActive}>🥩</Text>
        <Text style={tabStyles.tabLabelActive}>Inventory</Text>
      </View>
      <Pressable style={tabStyles.tab} onPress={onReports}>
        <Text style={tabStyles.tabIcon}>📊</Text>
        <Text style={tabStyles.tabLabel}>Reports</Text>
      </Pressable>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

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
      if (!tenantId) { setLoading(false); return; }
      if (!firebaseConfig || (firebaseConfig.apiKey ?? '').includes('YOUR_API_KEY')) { setLoading(false); return; }
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
    load();
    return () => { mounted = false; };
  }, [setLoading, setSummaries, tenantId]);

  return (
    <SafeAreaView style={styles.container}>
      <Header tenantId={tenantId} onBack={() => router.back()} />

      {(!firebaseConfig || (firebaseConfig.apiKey ?? '').includes('YOUR_API_KEY')) && (
        <SnapshotFallback tenantId={tenantId} setSummaries={setSummaries as any} />
      )}

      <View style={{ paddingHorizontal: 16 }}>
        <PageHeaderTitle tenantId={tenantId} />

        <View style={styles.statsRow}>
          <StatCard
            type="default"
            icon="🥩"
            value={String(summaries?.length ?? 0)}
            label="Total Items"
            sublabel="All items"
          />
          <StatCard
            type="warning"
            icon="⚠️"
            value={String(summaries?.filter((s: any) => s.lowStock).length ?? 0)}
            label="Low Stock"
            sublabel="Need attention"
          />
          <StatCard
            type="danger"
            icon="📦"
            value={String(summaries?.filter((s: any) => (s.totalQuantity ?? 0) <= 0).length ?? 0)}
            label="Out of Stock"
            sublabel="Unavailable"
          />
        </View>

        <SearchBar value={q} onChange={setQ} onFilter={() => {}} />
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator /></View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={summaries}
          keyExtractor={(item) => item.productId}
          renderItem={({ item }) => {
            if (q && !String(item.productName ?? item.productId).toLowerCase().includes(q.toLowerCase())) return null;
            return (
              <ItemCard
                summary={item}
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
            <View style={styles.empty}><Text style={styles.emptyText}>No inventory records found.</Text></View>
          )}
        />
      )}

      <View style={styles.footerAction}>
        <Pressable style={styles.addItemBtn} onPress={() => router.push('/inventory/stock-in')}>
          <Text style={styles.addItemBtnIcon}>⊕</Text>
          <Text style={styles.addItemBtnText}>Add Item</Text>
        </Pressable>
      </View>

      <BottomTabBar
        onDashboard={() => router.push('/dashboard')}
        onPlans={() => router.push('/plans')}
        onReports={() => {}}
      />
    </SafeAreaView>
  );
}

// ── Style Sheets ──────────────────────────────────────────────────────────────

const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CREAM,
  },
  headerBtn: { padding: 6 },
  hamburger: { fontSize: 24, color: MAROON, fontWeight: '600' },
  headerLogoBlock: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: MAROON_DARK },
  bellIcon: { fontSize: 22, color: MAROON_DARK },
});

const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingBottom: 8,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabActive: { borderTopWidth: 2, borderTopColor: MAROON_DARK, paddingTop: 4 },
  tabIcon: { fontSize: 20, color: '#A59B8E' },
  tabIconActive: { fontSize: 20, color: MAROON_DARK },
  tabLabel: { fontSize: 10, color: '#A59B8E', fontWeight: '600' },
  tabLabelActive: { fontSize: 10, color: MAROON_DARK, fontWeight: '700' },
});

const cardStyles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconText: { fontSize: 16, color: '#FFFFFF' },
  statTextWrap: { flex: 1 },
  statValueRow: { flexDirection: 'row', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  statLabel: { fontSize: 11, color: TEXT_DARK, fontWeight: '600', marginTop: 1 },
  statSublabel: { fontSize: 9, color: TEXT_MID, marginTop: 1 },
});

const searchStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { fontSize: 16, marginRight: 8, color: TEXT_LIGHT },
  input: { flex: 1, fontSize: 14, color: TEXT_DARK },
  filterBtn: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 44,
    justifyContent: 'center',
  },
  filterBtnText: { fontSize: 14, fontWeight: '700', color: MAROON_DARK },
});

const itemStyles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3ECE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: MAROON_DARK },
  infoWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  tag: { backgroundColor: '#F8F3EA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, color: MAROON_DARK, fontWeight: '600' },
  metaText: { fontSize: 12, color: TEXT_MID },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillIn: { backgroundColor: '#F0F9F4', borderColor: '#C3E6D1' },
  statusPillOut: { backgroundColor: '#FEF0F0', borderColor: '#FAD2D2' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotIn: { backgroundColor: '#2A8A52' },
  statusDotOut: { backgroundColor: MAROON },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextIn: { color: '#2A8A52' },
  statusTextOut: { color: MAROON },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginLeft: 60, // align with infoWrap
  },
  actionBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DED0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#4A4136' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  feedbackBlock: { padding: 20 },
  feedbackText: { color: '#7C7464' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  pageHeaderLeft: { width: 60 },
  pageHeaderLogo: { width: 100, height: 45, marginLeft: -20 },
  pageHeaderTextWrap: { flex: 1 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#1F1A14', letterSpacing: 1.5 },
  pageSubtitle: { fontSize: 8, color: '#6E6456', letterSpacing: 1 },
  tenantMeta: { fontSize: 10, color: TEXT_MID },

  statsRow: { flexDirection: 'row', gap: 8 },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  
  footerAction: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
  addItemBtn: {
    backgroundColor: MAROON_DARK,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addItemBtnIcon: { fontSize: 18, color: '#FFFFFF', marginTop: -2 },
  addItemBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: TEXT_MID },
});
