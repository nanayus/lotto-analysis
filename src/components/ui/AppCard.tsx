import type { PropsWithChildren } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { Card } from '@tamagui/card';

import { radius, useAppTheme } from '@/theme';

type AppCardProps = PropsWithChildren<{
  elevated?: boolean;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

export function AppCard({
  children,
  elevated = true,
  interactive = false,
  style,
  testID,
}: AppCardProps) {
  const { colors } = useAppTheme();
  const motionProps = { animation: 'quick' as const } as Record<string, unknown>;

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.divider,
          borderRadius: radius.md,
          borderWidth: 1,
        },
        elevated && {
          boxShadow: 'none',
          elevation: 0,
        },
        style,
      ]}
      testID={testID}>
      <Card
        {...motionProps}
        pressStyle={interactive ? { scale: 0.98 } : undefined}
        unstyled>
        {children}
      </Card>
    </View>
  );
}
