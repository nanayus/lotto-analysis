import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { normalizeDraftNumbers } from '@/features/combination/CombinationDraftContext';
import type { GeneratorConditionDescription } from '@/domain/generator/describeGeneratorConditions';

export type CombinationSource = 'ai' | 'random';

export type SavedCombination = {
  createdAt: string;
  favorite: boolean;
  generationConditions?: GeneratorConditionDescription[];
  id: string;
  numbers: number[];
  purchased: boolean;
  source: CombinationSource;
};

type NumberLibraryValue = {
  addCombination: (
    numbers: readonly number[],
    source: CombinationSource,
    options?: { generationConditions?: readonly GeneratorConditionDescription[] },
  ) => void;
  combinations: SavedCombination[];
  isReady: boolean;
  toggleFavorite: (id: string) => void;
  togglePurchased: (id: string) => void;
};

export const NUMBER_LIBRARY_STORAGE_KEY = 'lotto.numberLibrary.v2';

const fallbackValue: NumberLibraryValue = {
  addCombination: () => undefined,
  combinations: [],
  isReady: true,
  toggleFavorite: () => undefined,
  togglePurchased: () => undefined,
};

const NumberLibraryContext = createContext<NumberLibraryValue>(fallbackValue);

function isSavedCombination(value: unknown): value is SavedCombination {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SavedCombination>;
  return typeof item.id === 'string'
    && typeof item.createdAt === 'string'
    && typeof item.favorite === 'boolean'
    && typeof item.purchased === 'boolean'
    && (item.source === 'ai' || item.source === 'random')
    && Array.isArray(item.numbers)
    && normalizeDraftNumbers(item.numbers).length === 6;
}

function normalizeGenerationConditions(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const valid = value.every((item) => item
    && typeof item === 'object'
    && typeof (item as Partial<GeneratorConditionDescription>).key === 'string'
    && typeof (item as Partial<GeneratorConditionDescription>).label === 'string'
    && typeof (item as Partial<GeneratorConditionDescription>).value === 'string');
  if (!valid) return undefined;
  return value.map((item) => ({
    key: (item as GeneratorConditionDescription).key,
    label: (item as GeneratorConditionDescription).label,
    value: (item as GeneratorConditionDescription).value,
  }));
}

function normalizeStoredCombinations(values: unknown[]) {
  const seenIds = new Set<string>();
  return values.filter(isSavedCombination).map((item, index) => {
    const id = seenIds.has(item.id) ? `${item.id}-restored-${index}` : item.id;
    seenIds.add(id);
    const { generationConditions: storedGenerationConditions, ...storedItem } = item;
    const generationConditions = normalizeGenerationConditions(storedGenerationConditions);
    return {
      ...storedItem,
      ...(generationConditions ? { generationConditions } : {}),
      id,
      numbers: normalizeDraftNumbers(item.numbers),
    };
  });
}

export function NumberLibraryProvider({ children }: PropsWithChildren) {
  const [combinations, setCombinations] = useState<SavedCombination[]>([]);
  const [isReady, setIsReady] = useState(false);
  const idSequence = useRef(0);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(NUMBER_LIBRARY_STORAGE_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          setCombinations(normalizeStoredCombinations(parsed));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void AsyncStorage.setItem(NUMBER_LIBRARY_STORAGE_KEY, JSON.stringify(combinations))
      .catch(() => undefined);
  }, [combinations, isReady]);

  const addCombination = useCallback((
    numbers: readonly number[],
    source: CombinationSource,
    options?: { generationConditions?: readonly GeneratorConditionDescription[] },
  ) => {
    const normalized = normalizeDraftNumbers(numbers);
    if (normalized.length !== 6) return;
    idSequence.current += 1;
    const createdAt = new Date().toISOString();
    setCombinations((current) => [{
      createdAt,
      favorite: false,
      ...(options?.generationConditions ? {
        generationConditions: options.generationConditions.map((item) => ({ ...item })),
      } : {}),
      id: `${createdAt}-${idSequence.current}-${Math.random().toString(36).slice(2, 9)}`,
      numbers: normalized,
      purchased: false,
      source,
    }, ...current].slice(0, 200));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setCombinations((current) => current.map((item) => item.id === id
      ? { ...item, favorite: !item.favorite }
      : item));
  }, []);

  const togglePurchased = useCallback((id: string) => {
    setCombinations((current) => current.map((item) => item.id === id
      ? { ...item, purchased: !item.purchased }
      : item));
  }, []);

  const value = useMemo(() => ({
    addCombination,
    combinations,
    isReady,
    toggleFavorite,
    togglePurchased,
  }), [addCombination, combinations, isReady, toggleFavorite, togglePurchased]);

  return <NumberLibraryContext.Provider value={value}>{children}</NumberLibraryContext.Provider>;
}

export function useNumberLibrary() {
  return useContext(NumberLibraryContext);
}
