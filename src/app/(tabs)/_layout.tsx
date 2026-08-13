import { Tabs } from 'expo-router';
import { ColorValue, Platform, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type TabIconProps = {
  color: ColorValue;
  focused: boolean;
  kind: 'explore' | 'combination';
};

function TabIcon({ color, focused, kind }: TabIconProps) {
  if (kind === 'explore') {
    return (
      <View style={[styles.compass, { borderColor: color }]}>
        <View style={[styles.compassNeedle, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={[styles.hexagon, { borderColor: color }]}>
      <Text style={[styles.hexagonText, { color }]}>{focused ? '✦' : '·'}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: [styles.tabBar, Platform.OS === 'web' && styles.tabBarWeb],
        tabBarItemStyle: styles.tabItem,
      }}>
      <Tabs.Screen
        name="explore"
        options={{
          title: '탐색',
          tabBarAccessibilityLabel: '탐색 탭',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} kind="explore" />
          ),
        }}
      />
      <Tabs.Screen
        name="combination"
        options={{
          title: '조합 만들기',
          tabBarAccessibilityLabel: '조합 만들기 탭',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} kind="combination" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  tabLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
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
});
