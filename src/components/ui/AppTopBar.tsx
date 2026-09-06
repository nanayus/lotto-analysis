import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useMonetization } from '@/features/monetization/MonetizationContext';
import { ProStatusModal } from '@/features/monetization/ProStatusModal';
import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

export const TOP_BAR_HEIGHT = 58;
const webStickyHeader = Platform.select({
  web: { position: 'sticky', top: 0, zIndex: 20 } as unknown as ViewStyle,
});

type MainTabHeaderProps = {
  onProPress?: () => void;
};

export function MainTabHeader({ onProPress }: MainTabHeaderProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const monetization = useMonetization();
  const [proStatusVisible, setProStatusVisible] = useState(false);
  const isPro = monetization.productAccess.tier === 'pro';
  const proPlanEnabled = monetization.proPlanEnabled ?? true;
  const proExpiresAt = monetization.state?.status === 'ready'
    ? monetization.state.access.proExpiresAt
    : null;
  const subscriptionManagementUrl = monetization.subscriptionManagementUrl ?? null;

  const openSettings = () => router.navigate('/(tabs)/settings');

  const openAccess = () => {
    if (!isPro) {
      monetization.openPaywall?.('main-header');
      return;
    }
    if (onProPress) onProPress();
    else setProStatusVisible(true);
  };

  return (
    <View style={[styles.mainBar, webStickyHeader]} testID="main-tab-header">
      <Text numberOfLines={1} style={styles.brandName}>LOTTO INSIGHT</Text>
      <View style={styles.rightActions}>
        {proPlanEnabled ? (
          <Pressable
            accessibilityHint={isPro ? '구독 정보를 확인합니다' : 'Pro 혜택을 확인합니다'}
            accessibilityLabel={isPro ? 'PRO 플랜, 이용 정보 보기' : 'FREE 플랜, Pro 혜택 보기'}
            accessibilityRole="button"
            onPress={openAccess}
            style={({ pressed }) => [styles.accessButton, isPro ? styles.proButton : styles.freeButton, pressed && styles.pressed]}>
            <Text style={[styles.accessText, isPro && styles.proText]}>
              {isPro ? 'PRO' : 'FREE'}
            </Text>
            <Ionicons
              color={isPro ? colors.accentPrimary : colors.textTertiary}
              name="chevron-forward"
              size={13}
            />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityHint="환경설정으로 이동합니다"
          accessibilityLabel="환경설정"
          accessibilityRole="button"
          onPress={openSettings}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
          <Ionicons color={colors.textSecondary} name="settings-outline" size={20} />
        </Pressable>
      </View>
      {proPlanEnabled ? (
        <ProStatusModal
          expiresAt={proExpiresAt}
          onClose={() => setProStatusVisible(false)}
          onManage={subscriptionManagementUrl
            ? () => void Linking.openURL(subscriptionManagementUrl)
            : undefined}
          visible={proStatusVisible}
        />
      ) : null}
    </View>
  );
}

type SubScreenHeaderProps = {
  backAccessibilityLabel?: string;
  onBack: () => void;
  right?: ReactNode;
  title: string;
};

export function SubScreenHeader({
  backAccessibilityLabel = '이전 화면으로 돌아가기',
  onBack,
  right,
  title,
}: SubScreenHeaderProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.subBar, webStickyHeader]} testID="sub-screen-header">
      <Pressable
        accessibilityLabel={backAccessibilityLabel}
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}>
        <Ionicons color={colors.textPrimary} name="chevron-back" size={23} />
      </Pressable>
      <View pointerEvents="none" style={styles.centerTitle}>
        <Text numberOfLines={1} style={styles.subTitle}>{title}</Text>
      </View>
      <View style={styles.rightSlot}>{right}</View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  mainBar: {
    height: TOP_BAR_HEIGHT,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  brandName: {
    minWidth: 0,
    flexShrink: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.3,
  },
  rightActions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessButton: {
    minWidth: 68,
    height: 34,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.round,
  },
  freeButton: {
    backgroundColor: colors.background,
  },
  proButton: {
    backgroundColor: colors.surfaceAccent,
  },
  accessText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
  },
  proText: { color: colors.accentPrimary },
  subBar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  sideButton: {
    width: 52,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  centerTitle: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.3,
  },
  rightSlot: {
    minWidth: 52,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  pressed: { opacity: 0.66 },
});
