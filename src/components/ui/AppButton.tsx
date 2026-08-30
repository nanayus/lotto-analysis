import type { ReactNode } from 'react';
import { Platform, type StyleProp, View, type ViewStyle } from 'react-native';
import { Button } from '@tamagui/button';

import { radius, typography, useAppTheme } from '@/theme';

type AppButtonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  iconAfter?: ReactNode;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function AppButton({
  accessibilityLabel,
  disabled = false,
  iconAfter,
  label,
  onPress,
  style,
  testID,
  variant = 'primary',
}: AppButtonProps) {
  const { colors } = useAppTheme();
  const primary = variant === 'primary';
  const ghost = variant === 'ghost';
  const backgroundColor = disabled
    ? colors.accentDisabled
    : primary
      ? colors.accentPrimary
      : ghost
        ? 'transparent'
        : colors.surface;
  const textColor = primary
    ? '#FFFFFF'
    : disabled
      ? colors.textTertiary
      : colors.textPrimary;
  const motionProps = { animation: 'quick' as const } as Record<string, unknown>;
  const accessibilityProps = Platform.OS === 'web'
    ? { 'aria-label': accessibilityLabel ?? label }
    : {
        accessibilityLabel: accessibilityLabel ?? label,
        accessibilityRole: 'button' as const,
        accessibilityState: { disabled },
      };

  return (
    <View style={style}>
      <Button
        {...motionProps}
        {...accessibilityProps}
        backgroundColor={backgroundColor}
        alignItems="center"
        borderColor={ghost ? 'transparent' : primary ? colors.accentPrimary : colors.borderStrong}
        borderRadius={radius.round}
        borderWidth={ghost ? 0 : 1}
        disabled={disabled}
        flexDirection="row"
        gap={8}
        height={44}
        onPress={onPress}
        paddingHorizontal={22}
        justifyContent="center"
        pressStyle={{ opacity: disabled ? 1 : 0.9, scale: disabled ? 1 : 0.95 }}
        size={44}
        testID={testID}
        unstyled
        width="100%">
        <Button.Text
          color={textColor}
          fontSize={typography.sizes.body}
          fontWeight={typography.weights.regular}
          lineHeight={25}>
          {label}
        </Button.Text>
        {iconAfter}
      </Button>
    </View>
  );
}
