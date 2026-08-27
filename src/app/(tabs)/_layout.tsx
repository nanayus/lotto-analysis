import { useState } from 'react';
import { Tabs } from 'expo-router';
import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { PlatformPressable } from 'expo-router/build/react-navigation/elements';
import { ColorValue, Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ThemeColors, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

const TAB_BAR_CONTENT_HEIGHT = 60;

type TabIconProps = {
  color: ColorValue;
  focused: boolean;
  kind: 'explore' | 'combination' | 'generator' | 'settings';
};

function TabIcon({ color, focused, kind }: TabIconProps) {
  const styles = useThemedStyles(createStyles);

  if (kind === 'explore') {
    return (
      <View style={[styles.compass, { borderColor: color }]}>
        <View style={[styles.compassNeedle, { backgroundColor: color }]} />
      </View>
    );
  }

  if (kind === 'combination') return (
    <View style={[styles.hexagon, { borderColor: color }]}>
      <Text style={[styles.hexagonText, { color }]}>{focused ? '✦' : '·'}</Text>
    </View>
  );

  if (kind === 'generator') return (
    <View style={styles.generatorIcon}>
      <View style={[styles.generatorDot, { backgroundColor: color }]} />
      <View style={[styles.generatorDot, styles.generatorDotMiddle, { backgroundColor: color }]} />
      <View style={[styles.generatorDot, { backgroundColor: color }]} />
    </View>
  );

  return (
    <View style={styles.settingsIcon}>
      <View style={[styles.settingsLine, { backgroundColor: color }]}>
        <View style={[styles.settingsKnob, styles.settingsKnobLeft, { borderColor: color }]} />
      </View>
      <View style={[styles.settingsLine, { backgroundColor: color }]}>
        <View style={[styles.settingsKnob, styles.settingsKnobRight, { borderColor: color }]} />
      </View>
      <View style={[styles.settingsLine, { backgroundColor: color }]}>
        <View style={[styles.settingsKnob, styles.settingsKnobMiddle, { borderColor: color }]} />
      </View>
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

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.neutral,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: [
          styles.tabBar,
          { height: TAB_BAR_CONTENT_HEIGHT + insets.bottom },
          Platform.OS === 'web' && styles.tabBarWeb,
        ],
        tabBarItemStyle: styles.tabItem,
        tabBarButton: (props) => <TabBarButton {...props} />,
      }}>
      <Tabs.Screen
        name="combination-generator"
        options={{
          title: 'AI조합',
          tabBarAccessibilityLabel: 'AI조합 탭',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} kind="generator" />
          ),
        }}
      />
      <Tabs.Screen
        name="combination"
        options={{
          title: '랜덤조합',
          tabBarAccessibilityLabel: '랜덤조합 탭',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} kind="combination" />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '번호분석',
          tabBarAccessibilityLabel: '번호분석 탭',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} kind="explore" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '환경설정',
          tabBarAccessibilityLabel: '환경설정 탭',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} kind="settings" />
          ),
        }}
      />
    </Tabs>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 0,
    elevation: 0,
  },
  tabBarWeb: {
    width: '100%',
    maxWidth: 500,
    marginHorizontal: 'auto',
  },
  tabItem: {
    paddingTop: spacing.xs,
  },
  tabButtonFocused: {
    borderRadius: 8,
    boxShadow: `inset 0 0 0 1px ${colors.accentPrimary}`,
  },
  tabLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    lineHeight: 16,
  },
  compass: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-35deg' }],
  },
  compassNeedle: {
    width: 3,
    height: 11,
    borderRadius: 2,
  },
  hexagon: {
    width: 22,
    height: 20,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexagonText: {
    fontSize: 13,
    lineHeight: 16,
  },
  generatorIcon: {
    width: 24,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  generatorDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  generatorDotMiddle: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  settingsIcon: {
    width: 23,
    height: 20,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  settingsLine: {
    width: 23,
    height: 1.5,
    borderRadius: 1,
  },
  settingsKnob: {
    position: 'absolute',
    top: -2.5,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    backgroundColor: colors.background,
  },
  settingsKnobLeft: {
    left: 3,
  },
  settingsKnobRight: {
    right: 3,
  },
  settingsKnobMiddle: {
    left: 9,
  },
});
