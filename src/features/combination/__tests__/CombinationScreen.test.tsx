import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { CombinationScreen } from '../CombinationScreen';
import {
  CombinationDraftProvider,
  useCombinationDraft,
} from '../CombinationDraftContext';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), navigate: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({
    analyze: 'generated-result',
    returnTo: 'random-draw',
  })),
}));

const mockReplace = router.replace as jest.Mock;

function SeededCombinationScreen() {
  const { setNumbers } = useCombinationDraft();
  useEffect(() => {
    setNumbers([1, 7, 12, 19, 34, 45]);
  }, [setNumbers]);
  return <CombinationScreen />;
}

describe('CombinationScreen', () => {
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
});
