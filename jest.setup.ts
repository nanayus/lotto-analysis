import 'react-native-gesture-handler/jestSetup';
import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Error: 'error', Success: 'success', Warning: 'warning' },
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-reanimated', () => {
  return jest.requireActual('react-native-reanimated/mock');
});
