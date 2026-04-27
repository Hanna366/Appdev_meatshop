import { Redirect, useRouter } from 'expo-router';
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
import { useProductStore } from '../src/features/product/store/useProductStore';
import { evaluateEntitlement } from '../src/features/subscription/services/entitlementService';
import { useSubscriptionStore } from '../src/features/subscription/store/useSubscriptionStore';
import { useSyncQueueStore } from '../src/features/sync/store/useSyncQueueStore';
import { useTenantStore } from '../src/features/tenant/store/useTenantStore';

const MAROON = '#6B1A2A';
const MAROON_DARK = '#5A1220';
const CREAM = '#F2EDE4';
const CARD = '#FFFFFF';
const BORDER = '#E8DDD2';
const TEXT_DARK = '#1A1411';
const TEXT_MID = '#7A7061';
const TEXT_LIGHT = '#9A8A78';

// ── Sidebar Nav Item ─────────────────────────────────────────────────────────
function SideNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sideStyles.navItem,
        active && sideStyles.navItemActive,
        pressed && !active && { opacity: 0.7 },
      ]}
    >
      <Text style={[sideStyles.navIcon, active && sideStyles.navIconActive]}>{icon}</Text>
      <Text style={[sideStyles.navLabel, active && sideStyles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={cardStyles.statCard}>
      <View style={cardStyles.statIconCircle}>
        <Text style={cardStyles.statIconText}>{icon}</Text>
      </View>
      <View style={cardStyles.statTextWrap}>
        <Text style={cardStyles.statValue}>{value}</Text>
        <Text style={cardStyles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ── Tool Card ─────────────────────────────────────────────────────────────────
function ToolCard({
  icon,
  label,
  description,
  onPress,
}: {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cardStyles.toolCard, pressed && { opacity: 0.8 }]}
    >
      <View style={cardStyles.toolIconCircle}>
        <Text style={cardStyles.toolIconText}>{icon}</Text>
      </View>
      <View style={cardStyles.toolTextWrap}>
        <Text style={cardStyles.toolLabel}>{label}</Text>
        <Text style={cardStyles.toolDesc}>{description}</Text>
      </View>
      <Text style={cardStyles.toolChevron}>›</Text>
    </Pressable>
  );
}

// ── Bottom Tab Bar (mobile) ───────────────────────────────────────────────────
function BottomTabBar({
  onPlans,
  onInventory,
}: {
  onPlans: () => void;
  onInventory: () => void;
}) {
  return (
    <View style={tabStyles.tabBar}>
      <View style={[tabStyles.tab, tabStyles.tabActive]}>
        <Text style={tabStyles.tabIconActive}>⌂</Text>
        <Text style={tabStyles.tabLabelActive}>Dashboard</Text>
      </View>
      <Pressable style={tabStyles.tab} onPress={onPlans}>
        <Text style={tabStyles.tabIcon}>📋</Text>
        <Text style={tabStyles.tabLabel}>Plans</Text>
      </Pressable>
      <Pressable style={tabStyles.tab} onPress={onInventory}>
        <Text style={tabStyles.tabIcon}>🥩</Text>
        <Text style={tabStyles.tabLabel}>Inventory</Text>
      </Pressable>
      <Pressable style={tabStyles.tab}>
        <Text style={tabStyles.tabIcon}>📊</Text>
        <Text style={tabStyles.tabLabel}>Reports</Text>
      </Pressable>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const products = useProductStore((s) => s.products);
  const tenants = useTenantStore((s) => s.tenants);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const clearActiveTenant = useTenantStore((s) => s.clearActiveTenant);
  const queueSize = useSyncQueueStore((s) => s.queue.length);
  const auditCount = useAuditLogStore((s) => s.events.length);
  const appendAuditEvent = useAuditLogStore((s) => s.appendEvent);
  const subscriptionsByTenantId = useSubscriptionStore((s) => s.subscriptionsByTenantId);
  const usageByTenantId = useSubscriptionStore((s) => s.usageByTenantId);

  const activeTenant = tenants.find((t) => t.id === activeTenantId);
  const activeSubscription = activeTenantId ? subscriptionsByTenantId[activeTenantId] : undefined;
  const activeUsage = activeTenantId ? usageByTenantId[activeTenantId] : undefined;
  const canViewProducts = hasPermission(user?.role, 'products.view');
  const reportsEntitlement =
    activeSubscription && activeUsage
      ? evaluateEntitlement({ subscription: activeSubscription, usage: activeUsage, feature: 'canExportReports' })
      : { allowed: false, message: 'No active subscription.', requiredPlan: 'standard' as const };

  const planLabel = activeSubscription?.planId
    ? activeSubscription.planId.charAt(0).toUpperCase() + activeSubscription.planId.slice(1)
    : 'Unknown';
  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Unknown';
  const planStatus = activeSubscription?.status?.toUpperCase() ?? 'NOT SET';

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

  if (!isAuthenticated) return <Redirect href="/login" />;

  // ── Shared scrollable body ──────────────────────────────────────────────────
  const body = (
    <ScrollView
      style={{ flex: 1, backgroundColor: CREAM }}
      contentContainerStyle={[
        sharedStyles.scrollContent,
        isDesktop && sharedStyles.scrollContentDesktop,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Desktop page header (sidebar layout) */}
      {isDesktop && (
        <View style={sharedStyles.desktopPageHeader}>
          <Text style={sharedStyles.desktopPageTitle}>Dashboard</Text>
          <Text style={sharedStyles.desktopPageSubtitle}>
            Track operations and manage your workspace in real time.
          </Text>
        </View>
      )}

      {/* Welcome Card */}
      <View style={sharedStyles.welcomeCard}>
        <View style={sharedStyles.welcomeRow}>
          <View style={sharedStyles.avatarCircle}>
            <Image
              source={require('../assets/logo.png')}
              style={sharedStyles.avatarLogo}
              resizeMode="contain"
            />
          </View>
          <View style={sharedStyles.welcomeTextBlock}>
            <Text style={sharedStyles.welcomeName}>Welcome, {user?.name ?? 'User'}</Text>
            <Text style={sharedStyles.welcomeEmail}>{user?.email}</Text>
            <View style={sharedStyles.metaDivider} />
            <View style={sharedStyles.metaRow}>
              <Text style={sharedStyles.metaIcon}>🏢</Text>
              <Text style={sharedStyles.metaKey}>Tenant</Text>
              <Text style={sharedStyles.metaVal}>{activeTenant?.name ?? 'Unassigned'}</Text>
            </View>
            <View style={sharedStyles.metaRow}>
              <Text style={sharedStyles.metaIcon}>📋</Text>
              <Text style={sharedStyles.metaKey}>Plan</Text>
              <Text style={sharedStyles.metaVal}>{planLabel}</Text>
            </View>
            <View style={sharedStyles.metaRow}>
              <Text style={sharedStyles.metaIcon}>👤</Text>
              <Text style={sharedStyles.metaKey}>Role</Text>
              <Text style={sharedStyles.metaVal}>{roleLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Overview */}
      <View style={sharedStyles.sectionHeader}>
        <View style={sharedStyles.sectionTitleRow}>
          <Text style={sharedStyles.sectionIcon}>📊</Text>
          <Text style={sharedStyles.sectionTitle}>Overview</Text>
        </View>
        <View style={sharedStyles.filterPill}>
          <Text style={sharedStyles.filterPillText}>📅 All Time ▾</Text>
        </View>
      </View>

      <View style={[sharedStyles.statsGrid, isDesktop && sharedStyles.statsGridDesktop]}>
        <StatCard icon="🥩" value={String(products.length)} label="Products" />
        <StatCard icon="🛒" value={String(queueSize)} label="Orders Count" />
        <StatCard icon="📦" value={String(auditCount)} label="Stock Items" />
        <StatCard icon="🎖️" value={planStatus} label="Plan Status" />
      </View>

      {/* Main Action */}
      <View style={sharedStyles.sectionHeader}>
        <View style={sharedStyles.sectionTitleRow}>
          <Text style={sharedStyles.sectionIcon}>✂️</Text>
          <Text style={sharedStyles.sectionTitle}>Main Action</Text>
        </View>
      </View>

      <View style={sharedStyles.mainActionCard}>
        <Text style={sharedStyles.mainActionDesc}>
          Jump into your product workflow and continue selling with synced inventory.
        </Text>
        <Pressable
          onPress={() => router.push('/products')}
          disabled={!canViewProducts}
          style={({ pressed }) => [
            sharedStyles.catalogBtn,
            !canViewProducts && { opacity: 0.5 },
            pressed && canViewProducts && { opacity: 0.85 },
          ]}
        >
          <Text style={sharedStyles.catalogBtnIcon}>✂️</Text>
          <Text style={sharedStyles.catalogBtnText}>Open Product Catalog</Text>
        </Pressable>
      </View>

      {/* Tools */}
      <View style={sharedStyles.sectionHeader}>
        <View style={sharedStyles.sectionTitleRow}>
          <Text style={sharedStyles.sectionIcon}>⚙️</Text>
          <Text style={sharedStyles.sectionTitle}>Tools</Text>
        </View>
      </View>

      <View style={[sharedStyles.toolsList, isDesktop && sharedStyles.toolsListDesktop]}>
        <ToolCard
          icon="📋"
          label="Manage Plans"
          description="View and manage subscription plans"
          onPress={() => router.push('/plans')}
        />
        <ToolCard
          icon="🥩"
          label="Inventory"
          description="Manage your stock and items"
          onPress={() => router.push('/inventory')}
        />
        <ToolCard
          icon="📄"
          label="Export Reports"
          description="Generate and export business reports"
          onPress={() => { }}
        />
      </View>

      {/* Mobile logout spacing */}
      {!isDesktop && <View style={{ height: 8 }} />}
    </ScrollView>
  );

  // ── DESKTOP layout (sidebar) ────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <SafeAreaView style={desktopStyles.screen}>
        {/* Sidebar */}
        <View style={desktopStyles.sidebar}>
          <View style={desktopStyles.logoBlock}>
            <View style={desktopStyles.logoCircle}>
              <Image
                source={require('../assets/logo.png')}
                style={desktopStyles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={desktopStyles.logoTitle}>MEATSHOP</Text>
            <Text style={desktopStyles.logoSubtitle}>PREMIUM QUALITY MEATS</Text>
          </View>

          <View style={desktopStyles.navList}>
            <SideNavItem icon="⊞" label="Dashboard" active onPress={() => { }} />
            <SideNavItem icon="≡" label="Manage Plans" onPress={() => router.push('/plans')} />
            <SideNavItem icon="▦" label="Inventory" onPress={() => router.push('/inventory')} />
            <SideNavItem
              icon="▲"
              label="Export Reports"
              onPress={() => { }}
            />
          </View>

          <View style={desktopStyles.sidebarFooter}>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [desktopStyles.logoutBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={desktopStyles.logoutIcon}>⏻</Text>
              <Text style={desktopStyles.logoutLabel}>Log out</Text>
            </Pressable>
          </View>
        </View>

        {/* Main */}
        <View style={{ flex: 1 }}>{body}</View>
      </SafeAreaView>
    );
  }

  // ── MOBILE layout (top header + bottom tabs) ────────────────────────────────
  return (
    <SafeAreaView style={mobileStyles.screen}>
      {/* Top Header */}
      <View style={mobileStyles.header}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [mobileStyles.headerBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={mobileStyles.hamburger}>☰</Text>
        </Pressable>

        <View style={mobileStyles.headerLogoBlock}>
          <Image
            source={require('../assets/logo.png')}
            style={mobileStyles.headerLogo}
            resizeMode="contain"
          />
          <Text style={mobileStyles.headerLogoTitle}>MEATSHOP</Text>
          <Text style={mobileStyles.headerLogoSub}>PREMIUM QUALITY MEATS</Text>
        </View>

        <Pressable style={mobileStyles.headerBtn}>
          <Text style={mobileStyles.bellIcon}>🔔</Text>
        </Pressable>
      </View>

      {body}

      <BottomTabBar
        onPlans={() => router.push('/plans')}
        onInventory={() => router.push('/inventory')}
      />
    </SafeAreaView>
  );
}

// ── Style Sheets ──────────────────────────────────────────────────────────────

const sideStyles = StyleSheet.create({
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  navItemActive: { backgroundColor: MAROON_DARK },
  navIcon: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  navIconActive: { color: '#FFFFFF' },
  navLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  navLabelActive: { color: '#FFFFFF', fontWeight: '700' },
});

const cardStyles = StyleSheet.create({
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#1A0A00',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5EDE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconText: { fontSize: 20 },
  statTextWrap: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: TEXT_DARK },
  statLabel: { fontSize: 11, color: TEXT_MID, fontWeight: '600', marginTop: 2 },

  toolCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#1A0A00',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toolIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5EDE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconText: { fontSize: 18 },
  toolTextWrap: { flex: 1 },
  toolLabel: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  toolDesc: { fontSize: 11, color: TEXT_LIGHT, marginTop: 2 },
  toolChevron: { fontSize: 22, color: '#B0A090', fontWeight: '300' },
});

const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: MAROON,
    paddingBottom: 8,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: '#FFFFFF',
    paddingTop: 4,
  },
  tabIcon: { fontSize: 20, color: 'rgba(255,255,255,0.55)' },
  tabIconActive: { fontSize: 20, color: '#FFFFFF' },
  tabLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  tabLabelActive: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
});

const sharedStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  scrollContentDesktop: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 32,
  },

  // Desktop only page header
  desktopPageHeader: { gap: 3 },
  desktopPageTitle: { fontSize: 26, fontWeight: '800', color: TEXT_DARK, letterSpacing: 0.2 },
  desktopPageSubtitle: { fontSize: 13, color: TEXT_MID },

  // Welcome Card
  welcomeCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#1A0A00',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  welcomeRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  avatarLogo: { width: 38, height: 38 },
  welcomeTextBlock: { flex: 1, gap: 3 },
  welcomeName: { fontSize: 16, fontWeight: '800', color: MAROON },
  welcomeEmail: { fontSize: 12, color: TEXT_MID },
  metaDivider: { height: 1, backgroundColor: '#EDE5D8', marginVertical: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  metaIcon: { fontSize: 12, width: 16 },
  metaKey: { fontSize: 12, color: TEXT_LIGHT, width: 44, fontWeight: '600' },
  metaVal: { fontSize: 12, color: TEXT_DARK, fontWeight: '700' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionIcon: { fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  filterPill: {
    backgroundColor: CARD,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#DDD4C5',
    elevation: 1,
  },
  filterPillText: { fontSize: 11, fontWeight: '600', color: '#5A5146' },

  // Stats grid — mobile 2-col wrapping
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statsGridDesktop: {
    flexWrap: 'nowrap',
  },

  // Main Action
  mainActionCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
    shadowColor: '#1A0A00',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  mainActionDesc: { fontSize: 13, color: '#6A6055', lineHeight: 20 },
  catalogBtn: {
    backgroundColor: MAROON_DARK,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  catalogBtnIcon: { fontSize: 14, color: '#FFFFFF' },
  catalogBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Tools — vertical list on mobile, horizontal on desktop
  toolsList: { gap: 10 },
  toolsListDesktop: {
    flexDirection: 'row',
    gap: 10,
  },
});

const desktopStyles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: CREAM },
  sidebar: {
    width: 160,
    backgroundColor: MAROON,
    paddingTop: 20,
    paddingBottom: 20,
    flexDirection: 'column',
  },
  logoBlock: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    marginBottom: 8,
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  logoImg: { width: 36, height: 36 },
  logoTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  logoSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 7, letterSpacing: 1, marginTop: 2 },
  navList: { flex: 1, paddingTop: 6, gap: 2 },
  sidebarFooter: {
    paddingHorizontal: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  logoutIcon: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  logoutLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
});

const mobileStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CREAM },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CREAM,
  },
  headerBtn: { padding: 6 },
  hamburger: { fontSize: 24, color: MAROON },
  headerLogoBlock: { alignItems: 'center', justifyContent: 'center' },
  headerLogo: { width: 240, height: 110 },
  headerLogoTitle: { fontSize: 24, fontWeight: '900', color: TEXT_DARK, letterSpacing: 1.5, marginTop: -15 },
  headerLogoSub: { fontSize: 10, color: TEXT_MID, letterSpacing: 1 },
  bellIcon: { fontSize: 22 },
});
