import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { CombinationScreen } from '../CombinationScreen';
import {
  CombinationDraftProvider,
  useCombinationDraft,
} from '../CombinationDraftContext';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({
    analyze: 'generated-result',
    returnTo: 'random-draw',
  })),
}));

const mockReplace = router.replace as jest.Mock;
const mockBack = router.back as jest.Mock;
const mockCanGoBack = router.canGoBack as jest.Mock;
const mockSearchParams = useLocalSearchParams as jest.Mock;

function SeededCombinationScreen() {
  const { setNumbers } = useCombinationDraft();
  useEffect(() => {
    setNumbers([1, 7, 12, 19, 34, 45]);
  }, [setNumbers]);
  return <CombinationScreen />;
}

describe('CombinationScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockCanGoBack.mockReturnValue(false);
    mockReplace.mockClear();
    mockSearchParams.mockReturnValue({
      analyze: 'generated-result',
      returnTo: 'random-draw',
    });
  });

  test('returns New analysis from a result to the Number Draw home', async () => {
    mockReplace.mockClear();
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByText('조합 분석')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '새 조합 분석' }));
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/draw');
  });

  test('returns to the originating tab through history when the shared detail was pushed', async () => {
    mockCanGoBack.mockReturnValue(true);
    mockSearchParams.mockReturnValue({
      analyze: 'saved-combination-result',
      returnTo: 'my-numbers',
    });
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByText('조합 분석')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('returns to the existing condition selector instead of recreating it', async () => {
    mockCanGoBack.mockReturnValue(true);
    mockSearchParams.mockReturnValue({
      analyze: 'condition-result',
      returnTo: 'combination-generator',
    });
    const screen = await render(
      <CombinationDraftProvider>
        <SeededCombinationScreen />
      </CombinationDraftProvider>,
    );

    await waitFor(() => expect(screen.getByText('조합 분석')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
