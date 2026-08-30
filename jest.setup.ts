import 'react-native-gesture-handler/jestSetup';
import './tamagui.config';
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Error: 'error', Success: 'success', Warning: 'warning' },
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@tamagui/card', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Card = ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement(View, { testID }, children);
  return { Card };
});

jest.mock('@tamagui/button', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Button = ({
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    children,
    disabled,
    onPress,
    testID,
  }: {
    accessibilityLabel?: string;
    accessibilityRole?: 'button';
    accessibilityState?: { disabled?: boolean };
    children?: React.ReactNode;
    disabled?: boolean;
    onPress?: () => void;
    testID?: string;
  }) => React.createElement(Pressable, {
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    disabled,
    onPress,
    testID,
  }, children);
  Button.Text = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(Text, null, children);
  return { Button };
});

jest.mock('react-native-reanimated', () => {
  return jest.requireActual('react-native-reanimated/mock');
});
