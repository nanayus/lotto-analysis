import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { MonetizationSettingsSection } from '../MonetizationSettingsSection';

const mockOpenPaywall = jest.fn();
let mockIsPro = false;

jest.mock('../MonetizationContext', () => ({
  useMonetization: () => ({
    openPaywall: mockOpenPaywall,
    productAccess: {
      canCompareCombinations: false,
      canSaveNumbers: true,
      canUseBalancedPreset: mockIsPro,
      canUseAiExplanation: mockIsPro,
      canUseCustomPeriod: mockIsPro,
      combinationSelectionLimit: mockIsPro ? 5 : 2,
      conditionSelectionLimit: mockIsPro ? null : 2,
      requiresRewardedAdForResults: !mockIsPro,
      storageMode: mockIsPro ? 'cloud' : 'device',
      tier: mockIsPro ? 'pro' : 'guest',
    },
  }),
}));

describe('MonetizationSettingsSection', () => {
  beforeEach(() => {
    mockIsPro = false;
    mockOpenPaywall.mockClear();
  });

  test('uses Pro as the primary next step for a guest', async () => {
    const screen = await render(<MonetizationSettingsSection />);

    expect(screen.getByText('게스트')).toBeTruthy();
    expect(screen.getByText('광고 후 결과를 확인해요.')).toBeTruthy();
    fireEvent.press(screen.getByText('Pro'));
    expect(mockOpenPaywall).toHaveBeenCalledWith('settings');
  });

  test('shows Pro benefits for subscribers', async () => {
    mockIsPro = true;
    const screen = await render(<MonetizationSettingsSection />);

    expect(screen.getByText('Pro')).toBeTruthy();
    expect(screen.getByText('광고 없이 모든 기기에서 이어봐요.')).toBeTruthy();
  });
});
