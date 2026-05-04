import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export const MEATSHOP_COLORS = {
  background: '#F7F1E8',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF7F1',
  border: '#E6D8C8',
  text: '#211916',
  muted: '#7E7066',
  soft: '#A89787',
  maroon: '#7A1828',
  maroonDark: '#661120',
  gold: '#B89149',
  roseTint: '#F9E7EB',
  sandTint: '#F6EFE6',
  successBg: '#EEF8F2',
  successText: '#2F8F59',
  dangerBg: '#FFF1EC',
  dangerBorder: '#F2D2C6',
  dangerText: '#A23821',
} as const;

export const MEATSHOP_CARD_SHADOW = {
  shadowColor: '#5E2E22',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 4,
} as const;

export const MEATSHOP_SURFACE_CARD = {
  backgroundColor: MEATSHOP_COLORS.surface,
  borderWidth: 1,
  borderColor: MEATSHOP_COLORS.border,
  borderRadius: 28,
  ...MEATSHOP_CARD_SHADOW,
} as const satisfies ViewStyle;

export const MEATSHOP_INPUT = {
  backgroundColor: MEATSHOP_COLORS.surface,
  borderWidth: 1,
  borderColor: MEATSHOP_COLORS.border,
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: MEATSHOP_COLORS.text,
  fontSize: 15,
} as const satisfies ViewStyle & TextStyle;

export const MEATSHOP_PILL = {
  paddingHorizontal: 14,
  paddingVertical: 9,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: MEATSHOP_COLORS.border,
  backgroundColor: MEATSHOP_COLORS.surface,
} as const satisfies ViewStyle;

type HeaderActionProps = {
  children?: ReactNode;
  onPress?: () => void;
};

type PageHeaderProps = {
  leftAction?: HeaderActionProps;
  rightActions?: ReactNode;
};

type PageHeroProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children?: ReactNode;
  rightContent?: ReactNode;
};

type SectionHeaderProps = {
  title: string;
  icon?: ReactNode;
  accessory?: ReactNode;
};

type AppTabKey = 'dashboard' | 'plans' | 'inventory' | 'reports';

type BottomTabBarProps = {
  active: AppTabKey;
  onDashboard: () => void;
  onPlans: () => void;
  onInventory: () => void;
  onReports: () => void;
};

export function MeatshopShell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        <BackgroundGlow />
        {children}
      </View>
    </SafeAreaView>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.brandLockup, compact && styles.brandLockupCompact]}>
      <Image
        source={require('../../../assets/meet.png')}
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

export function MeatshopPageHeader({ leftAction, rightActions }: PageHeaderProps) {
  return (
    <View style={styles.mobileHeader}>
      {leftAction ? (
        <Pressable
          onPress={leftAction.onPress}
          style={({ pressed }) => [styles.mobileHeaderButton, pressed && { opacity: 0.68 }]}
        >
          {leftAction.children}
        </Pressable>
      ) : (
        <View style={styles.mobileHeaderSpacer} />
      )}

      <BrandLockup />

      {rightActions ? (
        <View style={styles.mobileHeaderActions}>{rightActions}</View>
      ) : (
        <View style={styles.mobileHeaderSpacer} />
      )}
    </View>
  );
}

export function MeatshopPageHero({
  title,
  subtitle,
  eyebrow,
  children,
  rightContent,
}: PageHeroProps) {
  return (
    <View style={styles.pageHero}>
      <View style={styles.pageHeroRow}>
        <View style={styles.pageHeroCopy}>
          {eyebrow ? <Text style={styles.pageHeroEyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.pageHeroTitle}>{title}</Text>
          <Text style={styles.pageHeroSubtitle}>{subtitle}</Text>
        </View>
        {rightContent ? <View style={styles.pageHeroAside}>{rightContent}</View> : null}
      </View>
      {children ? <View style={styles.pageHeroBody}>{children}</View> : null}
    </View>
  );
}

export function MeatshopSectionHeader({ title, icon, accessory }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <View style={styles.sectionIconBadge}>
          {icon ?? <Feather name="grid" size={18} color={MEATSHOP_COLORS.maroon} />}
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {accessory}
    </View>
  );
}

export function MeatshopSurfaceCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.surfaceCard, style]}>{children}</View>;
}

export function MeatshopHeaderIconButton({
  icon,
  onPress,
  showDot = false,
}: {
  icon: ReactNode;
  onPress?: () => void;
  showDot?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.mobileHeaderButton, pressed && onPress ? { opacity: 0.68 } : null]}
    >
      {icon}
      {showDot ? <View style={styles.notificationDot} /> : null}
    </Pressable>
  );
}

export function MeatshopBottomTabBar({
  active,
  onDashboard,
  onPlans,
  onInventory,
  onReports,
}: BottomTabBarProps) {
  const items: Array<{
    key: AppTabKey;
    label: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    onPress: () => void;
  }> = [
    {
      key: 'dashboard' as const,
      label: 'Dashboard',
      icon: 'home-variant',
      onPress: onDashboard,
    },
    {
      key: 'plans' as const,
      label: 'Plans',
      icon: 'clipboard-text-outline',
      onPress: onPlans,
    },
    {
      key: 'inventory' as const,
      label: 'Inventory',
      icon: 'food-steak',
      onPress: onInventory,
    },
    {
      key: 'reports' as const,
      label: 'Reports',
      icon: 'chart-bar',
      onPress: onReports,
    },
  ];

  return (
    <View style={styles.tabBarShell}>
      <View style={styles.tabBar}>
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.tabButton,
                isActive && styles.tabButtonActive,
                pressed && !isActive && styles.tabButtonPressed,
                pressed && isActive && styles.tabButtonActivePressed,
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={23}
                color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.78)'}
              />
              <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MEATSHOP_COLORS.background,
  },
  appShell: {
    flex: 1,
    backgroundColor: MEATSHOP_COLORS.background,
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
  brandLockup: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  brandLockupCompact: {
    gap: 3,
  },
  brandLogo: {
    width: 84,
    height: 46,
    marginBottom: -8,
  },
  brandLogoCompact: {
    width: 72,
    height: 38,
    marginBottom: -6,
  },
  brandWordmark: {
    color: MEATSHOP_COLORS.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 2.2,
    lineHeight: 28,
  },
  brandWordmarkCompact: {
    fontSize: 18,
    letterSpacing: 1.2,
    lineHeight: 20,
  },
  brandTagline: {
    color: MEATSHOP_COLORS.soft,
    fontSize: 10,
    letterSpacing: 3.6,
  },
  brandTaglineCompact: {
    fontSize: 8,
    letterSpacing: 2.4,
  },
  mobileHeader: {
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileHeaderButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mobileHeaderSpacer: {
    width: 48,
    height: 48,
  },
  mobileHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: MEATSHOP_COLORS.maroon,
  },
  pageHero: {
    ...MEATSHOP_SURFACE_CARD,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  pageHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  pageHeroCopy: {
    flex: 1,
    gap: 6,
  },
  pageHeroEyebrow: {
    color: MEATSHOP_COLORS.maroon,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  pageHeroTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 28,
    fontWeight: '900',
  },
  pageHeroSubtitle: {
    color: MEATSHOP_COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  pageHeroAside: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  pageHeroBody: {
    marginTop: 18,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: MEATSHOP_COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(122,24,40,0.08)',
  },
  sectionTitle: {
    color: MEATSHOP_COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  surfaceCard: {
    ...MEATSHOP_SURFACE_CARD,
    padding: 20,
  },
  tabBarShell: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 2,
    backgroundColor: 'transparent',
  },
  tabBar: {
    backgroundColor: MEATSHOP_COLORS.maroon,
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...MEATSHOP_CARD_SHADOW,
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
  tabButtonActivePressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
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
