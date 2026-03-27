import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { LockedFeatureNotice } from '../src/components/ui/LockedFeatureNotice';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { hasPermission } from '../src/features/access/services/accessControl';
import { useAuditLogStore } from '../src/features/audit/store/useAuditLogStore';
import { useAuthStore } from '../src/features/auth/store/useAuthStore';
import { useProductStore } from '../src/features/product/store/useProductStore';
import { evaluateEntitlement } from '../src/features/subscription/services/entitlementService';
import { useSubscriptionStore } from '../src/features/subscription/store/useSubscriptionStore';
import { useSyncQueueStore } from '../src/features/sync/store/useSyncQueueStore';
import { useTenantStore } from '../src/features/tenant/store/useTenantStore';

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const products = useProductStore((state) => state.products);
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
  const canViewAudit = hasPermission(user?.role, 'audit.view');
  const reportsEntitlement =
    activeSubscription && activeUsage
      ? evaluateEntitlement({
          subscription: activeSubscription,
          usage: activeUsage,
          feature: 'canExportReports',
        })
      : {
          allowed: false,
          message: 'No active subscription found for this tenant.',
          requiredPlan: 'standard' as const,
        };

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <ScreenContainer contentStyle={styles.contentContainer}>
      <View style={styles.root}>
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>
            Track operations and manage your workspace in real time.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.welcomeText}>Welcome, {user?.name}</Text>
          <Text style={styles.emailText}>{user?.email}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tenant</Text>
            <Text style={styles.metaValue}>{activeTenant?.name ?? 'Unassigned'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Plan</Text>
            <Text style={styles.metaValue}>{activeSubscription?.planId ?? 'unknown'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Role</Text>
            <Text style={styles.metaValue}>{user?.role ?? 'unknown'}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{activeSubscription?.status ?? 'not-configured'}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsColumn}>
            <StatCard label="Products" value={String(products.length)} />
          </View>
          <View style={styles.statsColumn}>
            <StatCard label="Offline Queue" value={String(queueSize)} />
          </View>
          <View style={styles.statsColumn}>
            <StatCard label="Audit Events" value={String(auditCount)} />
          </View>
          <View style={styles.statsColumn}>
            <StatCard
              label="Plan Status"
              value={activeSubscription?.status?.toUpperCase() ?? 'NOT SET'}
            />
          </View>
        </View>

        <View style={styles.primaryActionCard}>
          <Text style={styles.cardTitle}>Main Action</Text>
          <Text style={styles.cardBodyText}>
            Jump into your product workflow and continue selling with synced inventory.
          </Text>
          <PrimaryButton
            label="Open Product Catalog"
            onPress={() => router.push('/products')}
            disabled={!canViewProducts}
          />
        </View>

        <View style={styles.secondaryActionsCard}>
          <Text style={styles.cardTitle}>Tools</Text>
          <View style={styles.secondaryActionsGroup}>
            <PrimaryButton label="Manage Plans" onPress={() => router.push('/plans')} variant="secondary" />

            {reportsEntitlement.allowed ? (
              <PrimaryButton label="Export Reports" onPress={() => {}} variant="secondary" />
            ) : (
              <LockedFeatureNotice
                title="Reports Locked"
                message={reportsEntitlement.message ?? 'Export reports is unavailable on this plan.'}
                requiredPlan={reportsEntitlement.requiredPlan}
              />
            )}
          </View>

          {canViewAudit ? null : (
            <Text style={styles.helperText}>
              Your role cannot view audit history. Ask an owner or manager for access.
            </Text>
          )}
        </View>

        <View style={styles.footerActions}>
          <PrimaryButton
            label="Log out"
            onPress={() => {
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
            }}
            variant="secondary"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 28,
  },
  root: {
    gap: 16,
  },
  headerSection: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1713',
    letterSpacing: 0.2,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6C6559',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE4D8',
    gap: 8,
    shadowColor: '#2E2316',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2A241D',
  },
  emailText: {
    fontSize: 14,
    color: '#7A7061',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: '#8A7C6A',
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    color: '#2F2922',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C271F',
  },
  statusPill: {
    backgroundColor: '#F3EADF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5D5BE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A4B0D',
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statsColumn: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECE4D8',
    paddingVertical: 16,
    paddingHorizontal: 14,
    shadowColor: '#2E2316',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    minHeight: 98,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 23,
    fontWeight: '800',
    color: '#1F1A14',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7C7467',
    fontWeight: '600',
  },
  primaryActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6D8C7',
    gap: 12,
    shadowColor: '#2E2316',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  secondaryActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE4D8',
    gap: 10,
    shadowColor: '#2E2316',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2A251D',
  },
  cardBodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B6255',
  },
  secondaryActionsGroup: {
    gap: 10,
  },
  helperText: {
    fontSize: 13,
    color: '#7C7464',
    lineHeight: 18,
  },
  footerActions: {
    marginTop: 2,
  },
});
