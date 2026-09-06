import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';

import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import { useMonetization } from '@/features/monetization/MonetizationContext';

import { RandomDrawScreen } from '../RandomDrawScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));
jest.mock('@/features/combination/CombinationDraftContext', () => ({
  useCombinationDraft: jest.fn(),
}));
jest.mock('@/features/monetization/MonetizationContext', () => ({
  useMonetization: jest.fn(),
}));

const mockPush = router.push as jest.Mock;
const mockSetNumbers = jest.fn();
const mockShowResultAd = jest.fn(async () => true);
const mockUseCombinationDraft = useCombinationDraft as jest.MockedFunction<typeof useCombinationDraft>;
const mockUseMonetization = useMonetization as jest.MockedFunction<typeof useMonetization>;

describe('RandomDrawScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
    mockSetNumbers.mockClear();
    mockShowResultAd.mockClear();
    mockUseCombinationDraft.mockReturnValue({
      addNumber: jest.fn(),
      clear: jest.fn(),
      metadata: null,
      removeNumber: jest.fn(),
      selectedNumbers: [],
      setNumbers: mockSetNumbers,
      toggleNumber: jest.fn(),
    });
    mockUseMonetization.mockReturnValue({
      productAccess: {
        requiresAdForResults: true,
        tier: 'guest',
      },
      showResultAd: mockShowResultAd,
    } as unknown as ReturnType<typeof useMonetization>);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('shows the result ad immediately before opening combination analysis', async () => {
    const screen = await render(<RandomDrawScreen autoDrawToken="test-draw" gameCount={1} />);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(6_000);
    });
    const analyzeButton = await waitFor(() => screen.getByRole('button', {
      name: '조합 분석하기',
    }));

    await act(async () => {
      await fireEvent.press(analyzeButton);
    });

    expect(mockShowResultAd).toHaveBeenCalledTimes(1);
    expect(mockSetNumbers).toHaveBeenCalledWith(expect.any(Array), { source: 'random' });
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
      pathname: '/combination-analysis',
      params: expect.objectContaining({ accessMethod: 'interstitial' }),
    }));
  });
});
