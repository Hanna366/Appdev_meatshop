import React from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const COLORS = {
  background: '#F6F6F3',
  primary: '#7A1F1F',
  card: '#FFFFFF',
  muted: '#6A655B',
  border: '#ECE6E0',
  success: '#2BB673',
  warn: '#FFB020',
  danger: '#E53935',
};

export const InventoryStatCard: React.FC<{ title: string; value: string | number; subtitle?: string }> = ({ title, value, subtitle }) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon} />
    <View style={{ marginLeft: 8 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle ? <Text style={styles.statMeta}>{subtitle}</Text> : null}
    </View>
  </View>
);

export const InventorySearchBar: React.FC<{ value: string; onChange: (v: string) => void; onFilter?: () => void }> = ({ value, onChange, onFilter }) => (
  <View style={styles.searchRow}>
    <View style={styles.searchBox}>
      <TextInput placeholder="Search meat or category..." value={value} onChangeText={onChange} style={styles.searchInput} />
    </View>
    <Pressable style={styles.filterBtn} onPress={onFilter}>
      <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Filter</Text>
    </Pressable>
  </View>
);

export const StockStatusBadge: React.FC<{ status: 'in' | 'low' | 'out' }> = ({ status }) => {
  const color = status === 'in' ? COLORS.success : status === 'low' ? COLORS.warn : COLORS.danger;
  const label = status === 'in' ? 'In Stock' : status === 'low' ? 'Low Stock' : 'Out of Stock';
  return (
    <View style={[styles.statusBadge, { borderColor: color }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
};

export type InventoryAction = 'in' | 'out' | 'adjust' | 'history';

export const InventoryItemCard: React.FC<{ summary: any; onPress?: () => void; onAction?: (a: InventoryAction) => void }> = ({ summary, onPress, onAction }) => {
  const name = summary.productName ?? summary.productId;
  const qty = summary.totalQuantity ?? 0;
  const batches = summary.batchesCount ?? 0;
  const status = summary.lowStock ? 'low' : qty <= 0 ? 'out' : 'in';

  return (
    <Pressable style={styles.itemCard} onPress={onPress}>
      <View style={styles.thumb}>
        {summary.imageUrl ? <Image source={{ uri: summary.imageUrl }} style={styles.thumbImg} /> : <View style={styles.thumbPlaceholder}><Text style={styles.thumbInitial}>{(name || '?').slice(0,2).toUpperCase()}</Text></View>}
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle}>{name}</Text>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <View style={styles.pill}><Text style={styles.pillText}>Fresh</Text></View>
          <View style={styles.pill}><Text style={styles.pillText}>{summary.type ?? 'Meat'}</Text></View>
        </View>
        <Text style={styles.itemMeta}>{qty} {summary.unit ?? 'kg'} • Batches: {batches}</Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => onAction?.('in')}><Text style={styles.actionText}>Stock In</Text></Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onAction?.('out')}><Text style={styles.actionText}>Stock Out</Text></Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onAction?.('adjust')}><Text style={styles.actionText}>Adjust</Text></Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onAction?.('history')}><Text style={styles.actionText}>History</Text></Pressable>
        </View>
      </View>
      <View style={styles.itemRight}><StockStatusBadge status={status as any} /></View>
    </Pressable>
  );
};

export const FloatingAddButton: React.FC<{ onPress?: () => void }> = ({ onPress }) => (
  <Pressable style={styles.fab} onPress={onPress}>
    <Text style={styles.fabText}>+ Add Item</Text>
  </Pressable>
);

export const InventoryDetailHero: React.FC<{ product: any; status: 'in' | 'low' | 'out' }> = ({ product, status }) => {
  const name = product?.name ?? product?.productName ?? 'Item';
  return (
    <View style={styles.hero}>
      <View style={styles.heroInner}>
        <View style={styles.heroImageWrap}>{product?.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.heroImage} /> : <View style={styles.heroPlaceholder}><Text style={{ color: '#fff', fontWeight: '700' }}>{(name||'').slice(0,2).toUpperCase()}</Text></View>}</View>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>{name}</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <View style={styles.pill}><Text style={styles.pillText}>Fresh</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>{product?.type ?? 'Chicken'}</Text></View>
          </View>
          <View style={{ marginTop: 8 }}><StockStatusBadge status={status} /></View>
        </View>
      </View>
    </View>
  );
};

export const InventoryMetricPanel: React.FC<{ metrics: { label: string; value: string }[] }> = ({ metrics }) => (
  <View style={styles.metricPanel}>
    {metrics.map((m, i) => (
      <View style={styles.metricItem} key={i}>
        <Text style={styles.metricValue}>{m.value}</Text>
        <Text style={styles.metricLabel}>{m.label}</Text>
      </View>
    ))}
  </View>
);

export const SectionCard: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={{ marginTop: 8 }}>{children}</View>
  </View>
);

export const BatchRow: React.FC<{ batch: any; onPress?: () => void }> = ({ batch, onPress }) => (
  <Pressable style={styles.batchRow} onPress={onPress}>
    <View>
      <Text style={{ fontWeight: '700' }}>{batch.id}</Text>
      <Text style={{ color: COLORS.muted, marginTop: 6 }}>{batch.date ?? batch.receivedAt}</Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{ fontWeight: '700' }}>{batch.quantity} kg</Text>
      <View style={[styles.statusPill, { backgroundColor: '#EDEDED', marginTop: 6 }]}><Text style={{ color: COLORS.primary }}>Active</Text></View>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  statCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, marginRight: 12, minWidth: 140 },
  statIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3EDEB' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  statTitle: { color: COLORS.muted, marginTop: 2 },
  statMeta: { color: COLORS.muted, marginTop: 4, fontSize: 12 },

  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  searchBox: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { height: 40 },
  filterBtn: { marginLeft: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.border },

  itemCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6 },
  thumb: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', marginRight: 12 },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, backgroundColor: '#F3EDEB', justifyContent: 'center', alignItems: 'center' },
  thumbInitial: { color: COLORS.primary, fontWeight: '700' },
  itemBody: { flex: 1 },
  itemTitle: { fontWeight: '700', fontSize: 16 },
  pill: { backgroundColor: '#F6F0EE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginRight: 8 },
  pillText: { color: COLORS.primary, fontWeight: '600', fontSize: 12 },
  itemMeta: { color: COLORS.muted, marginTop: 8 },
  actionRow: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginRight: 8, marginTop: 6, backgroundColor: '#FFF' },
  actionText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  itemRight: { marginLeft: 12 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 10, marginRight: 8 },
  statusLabel: { fontWeight: '700' },

  fab: { position: 'absolute', right: 18, bottom: 26, backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 28, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8 },
  fabText: { color: '#FFF', fontWeight: '700' },

  hero: { backgroundColor: COLORS.primary, padding: 14, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  heroInner: { flexDirection: 'row', alignItems: 'center' },
  heroImageWrap: { width: 96, height: 96, borderRadius: 12, overflow: 'hidden', marginRight: 12, backgroundColor: '#5A1010', justifyContent: 'center', alignItems: 'center' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: 96, height: 96, justifyContent: 'center', alignItems: 'center' },
  heroText: { flex: 1 },
  heroTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },

  metricPanel: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', marginTop: -28, marginHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  metricItem: { alignItems: 'center', flex: 1 },
  metricValue: { fontWeight: '700', fontSize: 20, color: COLORS.primary },
  metricLabel: { color: COLORS.muted, marginTop: 6 },

  sectionCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontWeight: '700' },

  batchRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F1EFEA' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
});

export default {};
