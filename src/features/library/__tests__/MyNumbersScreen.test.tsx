import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';

import {
  cloneGeneratorConditions,
  DEFAULT_GENERATOR_CONDITIONS,
  generateCombination,
} from '@/domain/generator/combinationGenerator';
import { describeGeneratorConditions } from '@/domain/generator/describeGeneratorConditions';
import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import { useNumberLibrary } from '@/features/library/NumberLibraryContext';
import { useMonetization } from '@/features/monetization/MonetizationContext';
import { productAccessFor } from '@/features/monetization/policy';

import { MyNumbersScreen } from '../MyNumbersScreen';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
jest.mock('@/features/combination/CombinationDraftContext', () => ({ useCombinationDraft: jest.fn() }));
jest.mock('@/features/library/NumberLibraryContext', () => ({ useNumberLibrary: jest.fn() }));
jest.mock('@/features/monetization/MonetizationContext', () => ({ useMonetization: jest.fn() }));
jest.mock('@/domain/generator/combinationGenerator', () => {
  const actual = jest.requireActual<typeof import('@/domain/generator/combinationGenerator')>(
    '@/domain/generator/combinationGenerator',
  );
  return { ...actual, generateCombination: jest.fn() };
});

const mockGenerateCombination = generateCombination as jest.MockedFunction<typeof generateCombination>;
const mockPush = router.push as jest.Mock;
const mockUseCombinationDraft = useCombinationDraft as jest.MockedFunction<typeof useCombinationDraft>;
const mockUseNumberLibrary = useNumberLibrary as jest.MockedFunction<typeof useNumberLibrary>;
const mockUseMonetization = useMonetization as jest.MockedFunction<typeof useMonetization>;

describe('MyNumbersScreen', () => {
  beforeEach(() => {
    mockUseMonetization.mockReturnValue({
      openPaywall: jest.fn(),
      productAccess: productAccessFor('guest'),
    } as unknown as ReturnType<typeof useMonetization>);
  });

  test('draws a new combination from the expanded saved conditions', async () => {
    mockPush.mockClear();
    const addCombination = jest.fn(() => 'generated-combination');
    const setNumbers = jest.fn();
    const conditions = cloneGeneratorConditions(DEFAULT_GENERATOR_CONDITIONS);
    conditions.sum = { enabled: true, min: 100, max: 140 };
    mockUseCombinationDraft.mockReturnValue({
      addNumber: jest.fn(),
      clear: jest.fn(),
      removeNumber: jest.fn(),
      selectedNumbers: [],
      setNumbers,
      toggleNumber: jest.fn(),
    });
    mockUseNumberLibrary.mockReturnValue({
      addCombination,
      canSave: true,
      combinations: [{
        createdAt: '2026-08-31T22:15:00.000Z',
        favorite: false,
        generationConditions: describeGeneratorConditions(conditions),
        generatorConditions: conditions,
        id: 'saved-ai-combination',
        numbers: [6, 7, 11, 28, 36, 44],
        purchased: false,
        source: 'ai',
      }],
      isReady: true,
      storageMode: 'device',
      toggleFavorite: jest.fn(),
      togglePurchased: jest.fn(),
    });
    mockGenerateCombination.mockResolvedValue({ numbers: [1, 2, 3, 40, 41, 45] } as Awaited<ReturnType<typeof generateCombination>>);

    const screen = await render(<MyNumbersScreen />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '생성 조건 보기' }));
    });

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '같은 조건으로 다시 뽑기' }));
    });

    await waitFor(() => expect(addCombination).toHaveBeenCalledWith(
      [1, 2, 3, 40, 41, 45],
      'ai',
      {
        generationConditions: describeGeneratorConditions(conditions),
        generatorConditions: conditions,
      },
    ));
    expect(setNumbers).toHaveBeenCalledWith([1, 2, 3, 40, 41, 45]);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/combination-analysis',
      params: {
        analyze: 'library-generated-combination',
        returnTo: 'my-numbers',
      },
    });
  });

  test('labels every guest result as requiring an ad', async () => {
    const setNumbers = jest.fn();
    mockUseCombinationDraft.mockReturnValue({
      addNumber: jest.fn(),
      clear: jest.fn(),
      removeNumber: jest.fn(),
      selectedNumbers: [],
      setNumbers,
      toggleNumber: jest.fn(),
    });
    mockUseMonetization.mockReturnValue({
      openPaywall: jest.fn(),
      productAccess: productAccessFor('guest'),
    } as unknown as ReturnType<typeof useMonetization>);
    mockUseNumberLibrary.mockReturnValue({
      addCombination: jest.fn(() => undefined),
      canSave: true,
      combinations: [{
        createdAt: '2026-08-31T23:09:00.000Z',
        favorite: false,
        id: 'analyzed-combination',
        numbers: [3, 16, 20, 23, 29, 45],
        purchased: false,
        source: 'random',
      }, {
        createdAt: '2026-08-31T22:48:00.000Z',
        favorite: false,
        id: 'new-combination',
        numbers: [5, 18, 25, 27, 30, 32],
        purchased: false,
        source: 'random',
      }],
      isReady: true,
      storageMode: 'device',
      toggleFavorite: jest.fn(),
      togglePurchased: jest.fn(),
    });

    const screen = await render(<MyNumbersScreen />);

    expect(screen.queryByText('분석 완료')).toBeNull();
    expect(screen.getByRole('button', { name: '3, 16, 20, 23, 29, 45 광고 후 분석 결과 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '5, 18, 25, 27, 30, 32 광고 후 분석 결과 보기' })).toBeTruthy();
    expect(screen.getAllByText('광고 후 결과 보기')).toHaveLength(2);
  });
});
