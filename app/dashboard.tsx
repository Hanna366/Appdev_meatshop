import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { hasPermission } from '../src/features/access/services/accessControl';
import { useAuditLogStore } from '../src/features/audit/store/useAuditLogStore';
import { useAuthStore } from '../src/features/auth/store/useAuthStore';
import { InventoryAlertsModal } from '../src/components/ui/InventoryAlertsModal';
import {
  fetchInventoryByTenantWithProducts,
  fetchInventoryFromProducts,
} from '../src/features/inventory/services/inventoryService';
import { useInventoryStore } from '../src/features/inventory/store/useInventoryStore';
import type { ProductInventorySummary } from '../src/features/inventory/types/inventoryTypes';
import { useProductStore } from '../src/features/product/store/useProductStore';
import { evaluateEntitlement } from '../src/features/subscription/services/entitlementService';
import { useSubscriptionStore } from '../src/features/subscription/store/useSubscriptionStore';
import { useSyncQueueStore } from '../src/features/sync/store/useSyncQueueStore';
import { useTenantStore } from '../src/features/tenant/store/useTenantStore';

const DEMO_LOCAL_USER_ID = 'usr_001';

const COLORS = {
  background: '#F7F1E8',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF7F1',
  border: '#E6D8C8',
  text: '#211916',
  muted: '#7E7066',
  soft: '#A89787',
  maroon: '#7A1828',
  maroonDark: '#661120',
  maroonMuted: '#9D5B67',
  gold: '#B89149',
  roseTint: '#F9E7EB',
  sandTint: '#F6EFE6',
};

const CARD_SHADOW = {
  shadowColor: '#5E2E22',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
} as const;

function formatLabel(value?: string | null) {
  if (!value) return 'Unknown';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function BackgroundGlow() {
  return (
    <View pointerEvents="none" style={styles.glowLayer}>
      <View style={styles.glowTopLeft} />
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottom} />
    </View>
  );
}

function BrandLockup({
  compact = false,
  align = 'center',
}: {
  compact?: boolean;
  align?: 'center' | 'left';
}) {
  return (
    <View
      style={[
        styles.brandLockup,
        compact && styles.brandLockupCompact,
        align === 'left' && styles.brandLockupLeft,
      ]}
    >
      <Image
        source={require('../assets/meet.png')}
        style={[styles.brandLogo, compact && styles.brandLogoCompact]}
        resizeMode="contain"
      />
      <Text style={[styles.brandWordmark, compact && styles.brandWordmarkCompact]}>MEATSHOP</Text>
      <Text style={[styles.brandTagline, compact && styles.brandTaglineCompact]}>
        PREMIUM QUALITY MEATS
      </Text>
    </View>
  );
}

function MetaRow({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.metaRow, compact && styles.metaRowCompact]}>
      <View style={[styles.metaLabelBlock, compact && styles.metaLabelBlockCompact]}>
        <View style={styles.metaIcon}>{icon}</View>
        <Text style={[styles.metaLabel, compact && styles.metaLabelCompact]}>{label}</Text>
      </View>
      <Text numberOfLines={compact ? 2 : 1} style={[styles.metaValue, compact && styles.metaValueCompact]}>
        {value}
      </Text>
    </View>
  );
}

function MetricCard({
  icon,
  value,
  label,
  bubbleColor,
  valueColor,
  desktop,
  compact = false,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  bubbleColor: string;
  valueColor?: string;
  desktop?: boolean;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.metricCard,
        desktop && styles.metricCardDesktop,
        compact && styles.metricCardCompact,
      ]}
    >
      <View
        style={[
          styles.metricIconBubble,
          { backgroundColor: bubbleColor },
          compact && styles.metricIconBubbleCompact,
        ]}
      >
        {icon}
      </View>
      <View style={[styles.metricCopy, compact && styles.metricCopyCompact]}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[
            styles.metricValue,
            compact && styles.metricValueCompact,
            valueColor ? { color: valueColor } : null,
          ]}
        >
          {value}
        </Text>
        <Text numberOfLines={2} style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function ToolCard({
  icon,
  label,
  description,
  onPress,
  desktop,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  onPress: () => void;
  desktop?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolCard,
        desktop && styles.toolCardDesktop,
        pressed && { opacity: 0.82 },
      ]}
    >
      <View style={styles.toolIconBubble}>{icon}</View>
      <View style={styles.toolCopy}>
        <Text style={styles.toolLabel}>{label}</Text>
        <Text style={styles.toolDescription}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={COLORS.soft} />
    </Pressable>
  );
}

function SidebarItem({
  active = false,
  label,
  icon,
  onPress,
}: {
  active?: boolean;
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sidebarItem,
        active && styles.sidebarItemActive,
        pressed && !active && { opacity: 0.8 },
      ]}
    >
      <View style={styles.sidebarIcon}>{icon}</View>
      <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function MobileTabBar({
  onPlans,
  onInventory,
  onReports,
}: {
  onPlans: () => void;
  onInventory: () => void;
  onReports: () => void;
}) {
  return (
    <View style={styles.tabBarShell}>
      <View style={styles.tabBar}>
        <View style={[styles.tabButton, styles.tabButtonActive]}>
          <MaterialCommunityIcons name="home-variant" size={24} color="#FFFFFF" />
          <Text style={styles.tabLabelActive}>Dashboard</Text>
        </View>

        <Pressable
          onPress={onPlans}
          style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
        >
          <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="rgba(255,255,255,0.78)" />
          <Text style={styles.tabLabel}>Plans</Text>
        </Pressable>

        <Pressable
          onPress={onInventory}
          style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
        >
          <MaterialCommunityIcons name="food-steak" size={24} color="rgba(255,255,255,0.78)" />
          <Text style={styles.tabLabel}>Inventory</Text>
        </Pressable>

        <Pressable
          onPress={onReports}
          style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
        >
          <MaterialCommunityIcons name="chart-bar" size={24} color="rgba(255,255,255,0.78)" />
          <Text style={styles.tabLabel}>Reports</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isCompactMobile = !isDesktop && width <= 390;
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const products = useProductStore((state) => state.products);
  const inventorySummaries = useInventoryStore((state) => state.summaries) as Array<
    ProductInventorySummary & { unit?: string }
  >;
  const setInventorySummaries = useInventoryStore((state) => state.setSummaries);
  const tenants = useTenantStore((state) => state.tenants);
  const activeTenantId = useTenantStore((state) => state.activeTenantId);
  const clearActiveTenant = useTenantStore((state) => state.clearActiveTenant);
  const queueSize = useSyncQueueStore((state) => state.queue.length);
  const auditCount = useAuditLogStore((state) => state.events.length);
  const appendAuditEvent = useAuditLogStore((state) => state.appendEvent);
  const subscriptionsByTenantId = useSubscriptionStore((state) => state.subscriptionsByTenantId);
  const usageByTenantId = useSubscriptionStore((state) => state.usageByTenantId);

  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const activeSubscription = activeTenantId ? subscriptionsByTenantId[activeTenantId] : undefined;
  const activeUsage = activeTenantId ? usageByTenantId[activeTenantId] : undefined;
  const canViewProducts = hasPermission(user?.role, 'products.view');
  const reportsEntitlement =
    activeSubscription && activeUsage
      ? evaluateEntitlement({
          subscription: activeSubscription,
          usage: activeUsage,
          feature: 'canExportReports',
        })
      : { allowed: false, message: 'No active subscription.', requiredPlan: 'standard' as const };

  const planLabel = formatLabel(activeSubscription?.planId);
  const roleLabel = formatLabel(user?.role);
  const planStatus = activeSubscription?.status?.toUpperCase() ?? 'NOT SET';
  const displayName = user?.name?.trim() || 'User';
  const displayEmail = user?.email?.trim() || 'No email available';
  const isDemoProfile = user?.id === DEMO_LOCAL_USER_ID;
  const reportsHint = reportsEntitlement.allowed
    ? 'Generate and export business reports'
    : reportsEntitlement.message ?? 'Generate and export business reports';

  useEffect(() => {
    let mounted = true;

    async function loadInventoryAlerts() {
      if (!activeTenantId) {
        setInventorySummaries([]);
        if (mounted) {
          setNotificationsLoading(false);
        }
        return;
      }

      if (mounted) {
        setNotificationsLoading(true);
      }

      try {
        let data = await fetchInventoryByTenantWithProducts(activeTenantId);
        if (!data || data.length === 0) {
          data = (await fetchInventoryFromProducts(activeTenantId)) as Array<
            ProductInventorySummary & { unit?: string }
          >;
        }

        if (mounted) {
          setInventorySummaries(data as ProductInventorySummary[]);
        }
      } catch (error) {
        console.warn('Failed to load dashboard stock alerts', error);
        if (mounted) {
          setInventorySummaries([]);
        }
      } finally {
        if (mounted) {
          setNotificationsLoading(false);
        }
      }
    }

    void loadInventoryAlerts();
    return () => {
      mounted = false;
    };
  }, [activeTenantId, setInventorySummaries]);

  const outOfStockAlerts = useMemo(
    () =>
      [...inventorySummaries]
        .filter((item) => Number(item.totalQuantity ?? 0) <= 0)
        .sort((left, right) =>
          String(left.productName ?? left.productId).localeCompare(String(right.productName ?? right.productId)),
        ),
    [inventorySummaries],
  );
  const lowStockAlerts = useMemo(
    () =>
      [...inventorySummaries]
        .filter((item) => Number(item.totalQuantity ?? 0) > 0 && Boolean(item.lowStock))
        .sort((left, right) => {
          const qtyDiff = Number(left.totalQuantity ?? 0) - Number(right.totalQuantity ?? 0);
          if (qtyDiff !== 0) return qtyDiff;
          return String(left.productName ?? left.productId).localeCompare(String(right.productName ?? right.productId));
        }),
    [inventorySummaries],
  );
  const notificationCount = outOfStockAlerts.length + lowStockAlerts.length;

  function handleOpenNotifications() {
    setIsNotificationsOpen(true);
  }

  function handleOpenInventoryFromNotifications() {
    setIsNotificationsOpen(false);
    router.push('/inventory');
  }

  function handleRestockProduct(productId: string) {
    setIsNotificationsOpen(false);
    router.push(`/inventory/stock-in?productId=${encodeURIComponent(productId)}`);
  }

  function handleLogout() {
    if (user && activeTenantId) {
      appendAuditEvent({
        id: `audit_${Date.now()}`,
        tenantId: activeTenantId,
        userId: user.id,
        action: 'auth.logout',
        createdAt: new Date().toISOString(),
      });
    }

    logout();
    clearActiveTenant();
    router.replace('/login');
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const metrics = [
    {
      key: 'products',
      icon: <MaterialCommunityIcons name="food-steak" size={30} color={COLORS.maroon} />,
      value: String(products.length),
      label: 'Products',
      bubbleColor: COLORS.roseTint,
    },
    {
      key: 'orders',
      icon: <MaterialCommunityIcons name="cart-outline" size={30} color={COLORS.gold} />,
      value: String(queueSize),
      label: 'Orders',
      bubbleColor: COLORS.sandTint,
    },
    {
      key: 'stock',
      icon: (
        <MaterialCommunityIcons
          name="package-variant-closed"
          size={30}
          color={COLORS.gold}
        />
      ),
      value: String(auditCount),
      label: 'Stock Items',
      bubbleColor: COLORS.sandTint,
    },
    {
      key: 'plan',
      icon: (
        <MaterialCommunityIcons
          name="medal-outline"
          size={30}
          color={COLORS.maroon}
        />
      ),
      value: planStatus,
      label: 'Plan Status',
      bubbleColor: COLORS.roseTint,
      valueColor: COLORS.maroon,
    },
  ] as const;

  const toolCards = [
    {
      key: 'plans',
      icon: <MaterialCommunityIcons name="clipboard-text-outline" size={26} color={COLORS.gold} />,
      label: 'Manage Plans',
      description: 'View and manage subscription plans',
      onPress: () => router.push('/plans'),
    },
    {
      key: 'inventory',
      icon: <MaterialCommunityIcons name="food-steak" size={26} color={COLORS.maroon} />,
      label: 'Inventory',
      description: 'Manage your stock and items',
      onPress: () => router.push('/inventory'),
    },
    {
      key: 'pos',
      icon: <Text style={styles.toolBadgeText}>POS</Text>,
      label: 'POS Checkout',
      description: 'Process weight-based meat sales',
      onPress: () => router.push('/pos'),
    },
    {
      key: 'operations',
      icon: <MaterialCommunityIcons name="account-group-outline" size={26} color={COLORS.maroon} />,
      label: 'Operations',
      description: 'Handle suppliers, customers, and receiving',
      onPress: () => router.push('/operations'),
    },
    {
      key: 'reports',
      icon: <MaterialCommunityIcons name="file-document-outline" size={26} color={COLORS.gold} />,
      label: 'Export Reports',
      description: reportsHint,
      onPress: () => router.push('/reports'),
    },
  ];

  const notificationModal = (
    <InventoryAlertsModal
      visible={isNotificationsOpen}
      loading={notificationsLoading}
      tenantName={activeTenant?.name ?? null}
      outOfStockItems={outOfStockAlerts}
      lowStockItems={lowStockAlerts}
      onClose={() => setIsNotificationsOpen(false)}
      onOpenInventory={handleOpenInventoryFromNotifications}
      onRestockItem={handleRestockProduct}
    />
  );

  const body = (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        isDesktop ? styles.scrollContentDesktop : styles.scrollContentMobile,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentFrame}>
        {isDesktop ? (
          <View style={styles.desktopHero}>
            <View style={styles.desktopHeroCopy}>
              <Text style={styles.desktopHeroTitle}>Dashboard</Text>
              <Text style={styles.desktopHeroSubtitle}>
                Keep your workspace, products, and plan health visible at a glance.
              </Text>
            </View>

            <View style={styles.desktopHeroAside}>
              <Pressable
                onPress={handleOpenNotifications}
                style={({ pressed }) => [
                  styles.desktopNotificationButton,
                  pressed && { opacity: 0.78 },
                ]}
              >
                <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.maroon} />
                {notificationCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {notificationCount > 9 ? '9+' : String(notificationCount)}
                    </Text>
                  </View>
                ) : null}
              </Pressable>

              <View style={styles.desktopStatusPill}>
                <Text style={styles.desktopStatusPillLabel}>Status</Text>
                <Text style={styles.desktopStatusPillValue}>{planStatus}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.profileCard, isCompactMobile && styles.profileCardCompact]}>
          <View style={[styles.profileRow, isCompactMobile && styles.profileRowCompact]}>
            <View style={styles.profileAvatarOuter}>
              <View style={[styles.profileAvatar, isCompactMobile && styles.profileAvatarCompact]}>
                <Image
                  source={isDemoProfile ? require('../assets/lor.jpg') : require('../assets/logo.png')}
                  style={[
                    isDemoProfile ? styles.profileAvatarPhoto : styles.profileAvatarLogo,
                    isCompactMobile && (isDemoProfile ? styles.profileAvatarPhotoCompact : styles.profileAvatarLogoCompact),
                  ]}
                  resizeMode={isDemoProfile ? 'cover' : 'contain'}
                />
              </View>
            </View>

            <View style={[styles.profileCopy, isCompactMobile && styles.profileCopyCompact]}>
              <Text numberOfLines={2} style={[styles.profileName, isCompactMobile && styles.profileNameCompact]}>
                Welcome, {displayName}
              </Text>
              <Text numberOfLines={1} style={[styles.profileEmail, isCompactMobile && styles.profileEmailCompact]}>
                {displayEmail}
              </Text>

              <View style={[styles.profileDivider, isCompactMobile && styles.profileDividerCompact]} />

              <View style={[styles.metaList, isCompactMobile && styles.metaListCompact]}>
                <MetaRow
                  icon={<MaterialCommunityIcons name="office-building-outline" size={22} color={COLORS.soft} />}
                  label="Tenant"
                  value={activeTenant?.name ?? 'Unassigned'}
                  compact={isCompactMobile}
                />
                <MetaRow
                  icon={<MaterialCommunityIcons name="clipboard-text-outline" size={22} color={COLORS.soft} />}
                  label="Plan"
                  value={planLabel}
                  compact={isCompactMobile}
                />
                <MetaRow
                  icon={<MaterialCommunityIcons name="account-outline" size={22} color={COLORS.soft} />}
                  label="Role"
                  value={roleLabel}
                  compact={isCompactMobile}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.sectionHeader, isCompactMobile && styles.sectionHeaderCompact]}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionIconBadge}>
              <Feather name="bar-chart-2" size={20} color={COLORS.maroon} />
            </View>
            <Text style={styles.sectionTitle}>Overview</Text>
          </View>

          <View style={[styles.filterPill, isCompactMobile && styles.filterPillCompact]}>
            <Feather name="calendar" size={17} color={COLORS.maroon} />
            <Text style={[styles.filterPillText, isCompactMobile && styles.filterPillTextCompact]}>All Time</Text>
            <Feather name="chevron-down" size={16} color={COLORS.soft} />
          </View>
        </View>

        <View style={[styles.metricsGrid, isCompactMobile && styles.metricsGridCompact]}>
          {metrics.map((metric) => (
            <MetricCard
              key={metric.key}
              icon={metric.icon}
              value={metric.value}
              label={metric.label}
              bubbleColor={metric.bubbleColor}
              valueColor={'valueColor' in metric ? metric.valueColor : undefined}
              desktop={isDesktop}
              compact={isCompactMobile}
            />
          ))}
        </View>

        <View style={styles.mainActionCard}>
          <View style={styles.mainActionCopyBlock}>
            <View style={styles.mainActionIconBubble}>
              <MaterialCommunityIcons name="content-cut" size={28} color={COLORS.maroon} />
            </View>

            <View style={styles.mainActionCopy}>
              <Text style={styles.mainActionTitle}>Main Action</Text>
              <Text style={styles.mainActionDescription}>
                Jump into your product workflow and continue selling with synced inventory.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/products')}
            disabled={!canViewProducts}
            style={({ pressed }) => [
              styles.catalogButton,
              !canViewProducts && styles.catalogButtonDisabled,
              pressed && canViewProducts && { opacity: 0.88 },
            ]}
          >
            <Text style={styles.catalogButtonText}>Open Product Catalog</Text>
            <Feather name="chevron-right" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionIconBadge}>
              <Feather name="settings" size={20} color={COLORS.maroon} />
            </View>
            <Text style={styles.sectionTitle}>Tools</Text>
          </View>
        </View>

        <View style={styles.toolsList}>
          {toolCards.map((tool) => (
            <ToolCard
              key={tool.key}
              icon={tool.icon}
              label={tool.label}
              description={tool.description}
              onPress={tool.onPress}
              desktop={isDesktop}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );

  if (isDesktop) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.appShell}>
          <BackgroundGlow />

          <View style={styles.desktopShell}>
            <View style={styles.sidebar}>
              <BrandLockup compact />

              <View style={styles.sidebarNav}>
                <SidebarItem
                  active
                  label="Dashboard"
                  icon={<MaterialCommunityIcons name="view-grid-outline" size={20} color={COLORS.maroon} />}
                  onPress={() => undefined}
                />
                <SidebarItem
                  label="Manage Plans"
                  icon={<MaterialCommunityIcons name="clipboard-text-outline" size={20} color={COLORS.muted} />}
                  onPress={() => router.push('/plans')}
                />
                <SidebarItem
                  label="Inventory"
                  icon={<MaterialCommunityIcons name="food-steak" size={20} color={COLORS.muted} />}
                  onPress={() => router.push('/inventory')}
                />
                <SidebarItem
                  label="Reports"
                  icon={<MaterialCommunityIcons name="chart-box-outline" size={20} color={COLORS.muted} />}
                  onPress={() => router.push('/reports')}
                />
              </View>

              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [styles.sidebarLogout, pressed && { opacity: 0.75 }]}
              >
                <MaterialCommunityIcons name="logout" size={20} color={COLORS.muted} />
                <Text style={styles.sidebarLogoutLabel}>Log out</Text>
              </Pressable>
            </View>

            <View style={styles.desktopMain}>{body}</View>
          </View>

          {notificationModal}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        <BackgroundGlow />

        <View style={styles.mobileHeader}>
          <View pointerEvents="none" style={styles.mobileHeaderBrandWrap}>
            <BrandLockup align="left" />
          </View>

          <View style={styles.mobileHeaderActions}>
            <Pressable
              onPress={handleOpenNotifications}
              style={({ pressed }) => [styles.mobileHeaderButton, pressed && { opacity: 0.72 }]}
            >
              <MaterialCommunityIcons name="bell-outline" size={28} color={COLORS.maroon} />
              {notificationCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 9 ? '9+' : String(notificationCount)}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.mobileHeaderButton,
                pressed && { opacity: 0.68 },
              ]}
            >
              <MaterialCommunityIcons name="logout" size={26} color={COLORS.maroon} />
            </Pressable>
          </View>
        </View>

        {body}

        <MobileTabBar
          onPlans={() => router.push('/plans')}
          onInventory={() => router.push('/inventory')}
          onReports={() => router.push('/reports')}
        />

        {notificationModal}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  appShell: {
    flex: 1,
    backgroundColor: COLORS.background,
    position: 'relative',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glowTopLeft: {
    position: 'absolute',
    top: -110,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  glowTopRight: {
    position: 'absolute',
    top: -40,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.52)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 120,
    left: '18%',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  scrollContentMobile: {
    paddingTop: 10,
    paddingBottom: 26,
  },
  scrollContentDesktop: {
    paddingTop: 26,
    paddingBottom: 40,
    paddingHorizontal: 28,
  },
  contentFrame: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    gap: 20,
  },
  brandLockup: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  brandLockupLeft: {
    alignItems: 'flex-start',
  },
  brandLockupCompact: {
    marginBottom: 18,
  },
  brandLogo: {
    width: 122,
    height: 70,
    marginBottom: -14,
  },
  brandLogoCompact: {
    width: 104,
    height: 58,
    marginBottom: -12,
  },
  brandWordmark: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 27,
  },
  brandWordmarkCompact: {
    fontSize: 20,
    letterSpacing: 1.6,
    lineHeight: 23,
  },
  brandTagline: {
    color: COLORS.soft,
    fontSize: 10,
    letterSpacing: 3.6,
  },
  brandTaglineCompact: {
    fontSize: 9,
    letterSpacing: 3.2,
  },
  mobileHeader: {
    minHeight: 94,
    paddingTop: 4,
    paddingBottom: 6,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  mobileHeaderBrandWrap: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingRight: 12,
    marginTop: -4,
  },
  mobileHeaderButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mobileHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginTop: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 1,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: COLORS.maroon,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    padding: 22,
    ...CARD_SHADOW,
  },
  profileCardCompact: {
    padding: 16,
    borderRadius: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  profileRowCompact: {
    gap: 12,
  },
  profileAvatarOuter: {
    paddingTop: 4,
  },
  profileAvatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileAvatarCompact: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  profileAvatarLogo: {
    width: 66,
    height: 34,
  },
  profileAvatarPhoto: {
    width: '100%',
    height: '100%',
  },
  profileAvatarLogoCompact: {
    width: 52,
    height: 26,
  },
  profileAvatarPhotoCompact: {
    width: '100%',
    height: '100%',
  },
  profileCopy: {
    flex: 1,
    gap: 8,
  },
  profileCopyCompact: {
    gap: 6,
  },
  profileName: {
    color: COLORS.maroon,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 28,
  },
  profileNameCompact: {
    fontSize: 17,
    lineHeight: 23,
  },
  profileEmail: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  profileEmailCompact: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#EEE1D2',
    marginTop: 2,
    marginBottom: 2,
  },
  profileDividerCompact: {
    marginTop: 0,
    marginBottom: 0,
  },
  metaList: {
    gap: 12,
  },
  metaListCompact: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaRowCompact: {
    alignItems: 'flex-start',
    gap: 8,
  },
  metaLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 116,
  },
  metaLabelBlockCompact: {
    minWidth: 84,
    gap: 8,
  },
  metaIcon: {
    width: 24,
    alignItems: 'center',
  },
  metaLabel: {
    color: COLORS.soft,
    fontSize: 14,
    fontWeight: '600',
  },
  metaLabelCompact: {
    fontSize: 12.5,
  },
  metaValue: {
    flex: 1,
    flexShrink: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'left',
  },
  metaValueCompact: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  sectionHeaderCompact: {
    gap: 10,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  sectionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(122,24,40,0.08)',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  filterPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...CARD_SHADOW,
  },
  filterPillCompact: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  filterPillText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  filterPillTextCompact: {
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metricsGridCompact: {
    gap: 12,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 128,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...CARD_SHADOW,
  },
  metricCardDesktop: {
    flexBasis: '23%',
  },
  metricCardCompact: {
    minHeight: 124,
    padding: 14,
    borderRadius: 20,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 12,
  },
  metricIconBubble: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconBubbleCompact: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  metricCopy: {
    flex: 1,
    gap: 6,
  },
  metricCopyCompact: {
    width: '100%',
    flex: 0,
    gap: 4,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  metricValueCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  metricLabelCompact: {
    fontSize: 11.5,
    lineHeight: 14,
  },
  mainActionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    padding: 22,
    gap: 18,
    ...CARD_SHADOW,
  },
  mainActionCopyBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  mainActionIconBubble: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainActionCopy: {
    flex: 1,
    gap: 6,
  },
  mainActionTitle: {
    color: COLORS.maroon,
    fontSize: 18,
    fontWeight: '800',
  },
  mainActionDescription: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 23,
    maxWidth: 460,
  },
  catalogButton: {
    minHeight: 70,
    borderRadius: 22,
    backgroundColor: COLORS.maroonDark,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    alignSelf: 'flex-end',
    minWidth: 250,
    ...CARD_SHADOW,
  },
  catalogButtonDisabled: {
    opacity: 0.5,
  },
  catalogButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  toolsList: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE1D2',
  },
  toolCardDesktop: {
    paddingHorizontal: 24,
  },
  toolIconBubble: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBadgeText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  toolCopy: {
    flex: 1,
    gap: 2,
  },
  toolLabel: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  toolDescription: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
    gap: 22,
    padding: 22,
  },
  sidebar: {
    width: 248,
    borderRadius: 30,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...CARD_SHADOW,
  },
  sidebarNav: {
    flex: 1,
    gap: 8,
  },
  sidebarItem: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarItemActive: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: 'rgba(122,24,40,0.1)',
  },
  sidebarIcon: {
    width: 24,
    alignItems: 'center',
  },
  sidebarLabel: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  sidebarLabelActive: {
    color: COLORS.maroon,
  },
  sidebarLogout: {
    borderTopWidth: 1,
    borderTopColor: '#EEE1D2',
    paddingTop: 18,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarLogoutLabel: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  desktopMain: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  desktopHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  desktopHeroAside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  desktopHeroCopy: {
    gap: 6,
  },
  desktopHeroTitle: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '900',
  },
  desktopHeroSubtitle: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  desktopNotificationButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...CARD_SHADOW,
  },
  desktopStatusPill: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-end',
    minWidth: 150,
    ...CARD_SHADOW,
  },
  desktopStatusPillLabel: {
    color: COLORS.soft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  desktopStatusPillValue: {
    color: COLORS.maroon,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  tabBarShell: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 2,
    backgroundColor: 'transparent',
  },
  tabBar: {
    backgroundColor: COLORS.maroon,
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...CARD_SHADOW,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 58,
    borderRadius: 18,
    marginHorizontal: 3,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tabButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
