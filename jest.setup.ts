import 'react-native-gesture-handler/jestSetup';
import { jest } from '@jest/globals';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-reanimated', () => {
  return jest.requireActual('react-native-reanimated/mock');
});
