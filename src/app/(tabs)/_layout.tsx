import { useState } from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { PlatformPressable } from 'expo-router/build/react-navigation/elements';
import { ColorValue, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, type ThemeColors, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';
const TAB_BAR_FLOATING_HEIGHT = 64;
const TAB_TRANSITION_DURATION_MS = 180;

type TabIconProps = {
  color: ColorValue;
  focused: boolean;
  kind: 'content' | 'draw' | 'library' | 'statistics';
};

function TabIcon({ color, focused, kind }: TabIconProps) {
  const styles = useThemedStyles(createStyles);
  const iconName = kind === 'draw'
    ? focused ? 'sparkles' : 'sparkles-outline'
    : kind === 'library'
      ? focused ? 'ticket' : 'ticket-outline'
      : kind === 'statistics'
        ? focused ? 'stats-chart' : 'stats-chart-outline'
        : focused ? 'newspaper' : 'newspaper-outline';

  return (
    <View style={[styles.iconShell, focused && styles.iconShellFocused]}>
      <Ionicons color={color} name={iconName} size={20} />
    </View>
  );
}

const webOutlineReset = Platform.select({
  web: { outlineStyle: 'none' } as unknown as ViewStyle,
});

function TabBarButton({ children, style, ...props }: BottomTabBarButtonProps) {
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);

  return (
    <PlatformPressable
      {...props}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      onFocus={(event) => {
        const target = event.target as unknown as { matches?: (selector: string) => boolean };
        setFocused(Platform.OS !== 'web' || target.matches?.(':focus-visible') !== false);
        props.onFocus?.(event);
      }}
      style={[style, webOutlineReset, focused && styles.tabButtonFocused]}>
      {children}
    </PlatformPressable>
  );
}

function TabsNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const tabBarBottom = Math.max(insets.bottom - spacing.lg, spacing.sm);

  return (
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        animation: 'fade',
        sceneStyle: {
          backgroundColor: colors.background,
          paddingBottom: TAB_BAR_FLOATING_HEIGHT + tabBarBottom + spacing.sm,
        },
        headerShown: false,
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.neutral,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: TAB_BAR_FLOATING_HEIGHT,
            bottom: tabBarBottom,
          },
          Platform.OS === 'web' && styles.tabBarWeb,
        ],
        tabBarItemStyle: styles.tabItem,
        tabBarButton: (props) => <TabBarButton {...props} />,
        transitionSpec: {
          animation: 'timing',
          config: { duration: TAB_TRANSITION_DURATION_MS },
        },
      }}>
      <Tabs.Screen
        name="draw"
        options={{
          title: '번호뽑기',
          tabBarAccessibilityLabel: '번호뽑기 탭',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} kind="draw" />
          ),
        }}
      />
      <Tabs.Screen
        name="my-numbers"
        options={{
          title: '내번호보기',
          tabBarAccessibilityLabel: '내번호보기 탭',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} kind="library" />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: '통계보기',
          tabBarAccessibilityLabel: '통계보기 탭',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} kind="statistics" />
          ),
        }}
      />
      <Tabs.Screen
        name="content"
        options={{
          title: '콘텐츠',
          tabBarAccessibilityLabel: '콘텐츠 탭',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} kind="content" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: '환경설정',
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
      <TabsNavigator />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.round,
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.14)',
    elevation: 8,
    overflow: 'hidden',
  },
  tabBarWeb: {
    maxWidth: 476,
    marginHorizontal: 'auto',
  },
  tabItem: {
    paddingTop: spacing.xs,
  },
  tabButtonFocused: {
    borderRadius: 8,
    boxShadow: `inset 0 0 0 2px ${colors.accentBorder}`,
  },
  tabLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    lineHeight: 16,
  },
  iconShell: {
    width: 36,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShellFocused: {
    backgroundColor: 'transparent',
  },
});
