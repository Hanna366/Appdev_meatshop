import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ProductInventorySummary } from '../../features/inventory/types/inventoryTypes';
import { MEATSHOP_CARD_SHADOW, MEATSHOP_COLORS, MEATSHOP_PILL } from './MeatshopChrome';

type InventoryAlertItem = ProductInventorySummary & { unit?: string };

type InventoryAlertsModalProps = {
  visible: boolean;
  loading?: boolean;
  tenantName?: string | null;
  outOfStockItems: InventoryAlertItem[];
  lowStockItems: InventoryAlertItem[];
  onClose: () => void;
  onOpenInventory: () => void;
  onRestockItem: (productId: string) => void;
};

function formatQty(item: InventoryAlertItem) {
  const unit = item.unit?.trim() || 'kg';
  return `${Number(item.totalQuantity ?? 0)} ${unit}`;
}

function AlertRow({
  item,
  kind,
  onPress,
}: {
  item: InventoryAlertItem;
  kind: 'out' | 'low';
  onPress: () => void;
}) {
  const isOut = kind === 'out';
  const subtitle = isOut
    ? 'Out of stock and needs restocking'
    : `${formatQty(item)} left${typeof item.lowStockThreshold === 'number' ? ` • Threshold ${item.lowStockThreshold}` : ''}`;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.alertRow, pressed && { opacity: 0.82 }]}>
      <View style={[styles.alertIconBubble, isOut ? styles.alertIconBubbleDanger : styles.alertIconBubbleWarning]}>
        <MaterialCommunityIcons
          name={isOut ? 'close-octagon-outline' : 'alert-outline'}
          size={22}
          color={isOut ? MEATSHOP_COLORS.dangerText : '#B97909'}
        />
      </View>

      <View style={styles.alertCopy}>
        <Text numberOfLines={1} style={styles.alertTitle}>
          {item.productName || item.productId}
        </Text>
        <Text style={styles.alertSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.alertAction}>
        <Text style={styles.alertActionText}>Restock</Text>
        <Feather name="chevron-right" size={16} color={MEATSHOP_COLORS.maroonDark} />
      </View>
    </Pressable>
  );
}

export function InventoryAlertsModal({
  visible,
  loading = false,
  tenantName,
  outOfStockItems,
  lowStockItems,
  onClose,
  onOpenInventory,
  onRestockItem,
}: InventoryAlertsModalProps) {
  const totalAlerts = outOfStockItems.length + lowStockItems.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <View style={styles.headerTitleRow}>
                <MaterialCommunityIcons name="bell-ring-outline" size={22} color={MEATSHOP_COLORS.maroon} />
                <Text style={styles.headerTitle}>Stock Alerts</Text>
              </View>
              <Text style={styles.headerSubtitle}>
                {tenantName ? `${tenantName} inventory health` : 'Inventory health overview'}
              </Text>
            </View>

            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.72 }]}>
              <Feather name="x" size={20} color={MEATSHOP_COLORS.maroon} />
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryPill, styles.summaryPillDanger]}>
              <Text style={styles.summaryLabel}>Out of stock</Text>
              <Text style={styles.summaryValue}>{outOfStockItems.length}</Text>
            </View>
            <View style={[styles.summaryPill, styles.summaryPillWarning]}>
              <Text style={styles.summaryLabel}>Low stock</Text>
              <Text style={styles.summaryValue}>{lowStockItems.length}</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryLabel}>Total alerts</Text>
              <Text style={styles.summaryValue}>{totalAlerts}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.feedbackState}>
              <ActivityIndicator color={MEATSHOP_COLORS.maroon} />
              <Text style={styles.feedbackText}>Loading stock alerts...</Text>
            </View>
          ) : totalAlerts === 0 ? (
            <View style={styles.feedbackState}>
              <View style={styles.emptyIconBubble}>
                <Feather name="check" size={22} color={MEATSHOP_COLORS.successText} />
              </View>
              <Text style={styles.emptyTitle}>All products look healthy</Text>
              <Text style={styles.feedbackText}>No low-stock or out-of-stock alerts right now.</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {outOfStockItems.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Out of Stock</Text>
                  {outOfStockItems.map((item) => (
                    <AlertRow
                      key={`out-${item.productId}`}
                      item={item}
                      kind="out"
                      onPress={() => onRestockItem(item.productId)}
                    />
                  ))}
                </View>
              ) : null}

              {lowStockItems.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Low Stock</Text>
                  {lowStockItems.map((item) => (
                    <AlertRow
                      key={`low-${item.productId}`}
                      item={item}
                      kind="low"
                      onPress={() => onRestockItem(item.productId)}
                    />
                  ))}
                </View>
              ) : null}
            </ScrollView>
          )}

          <View style={styles.footerRow}>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.82 }]}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
            <Pressable
              onPress={onOpenInventory}
              style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.86 }]}
            >
              <Text style={styles.primaryButtonText}>Open Inventory</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(33,25,22,0.34)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  sheet: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: MEATSHOP_COLORS.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
    padding: 20,
    gap: 18,
    ...MEATSHOP_CARD_SHADOW,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryPill: {
    ...MEATSHOP_PILL,
    minWidth: 108,
    gap: 2,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
  },
  summaryPillDanger: {
    backgroundColor: MEATSHOP_COLORS.dangerBg,
    borderColor: MEATSHOP_COLORS.dangerBorder,
  },
  summaryPillWarning: {
    backgroundColor: '#FFF7EA',
    borderColor: '#F1D9AF',
  },
  summaryLabel: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: MEATSHOP_COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  feedbackState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 12,
  },
  emptyIconBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: MEATSHOP_COLORS.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  feedbackText: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 16,
    paddingBottom: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: MEATSHOP_COLORS.maroon,
    fontSize: 15,
    fontWeight: '900',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: '#EEE1D2',
  },
  alertIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconBubbleDanger: {
    backgroundColor: MEATSHOP_COLORS.dangerBg,
  },
  alertIconBubbleWarning: {
    backgroundColor: '#FFF7EA',
  },
  alertCopy: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  alertSubtitle: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  alertAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  alertActionText: {
    color: MEATSHOP_COLORS.maroonDark,
    fontSize: 12,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: MEATSHOP_COLORS.border,
  },
  secondaryButtonText: {
    color: MEATSHOP_COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1.2,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MEATSHOP_COLORS.maroonDark,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
