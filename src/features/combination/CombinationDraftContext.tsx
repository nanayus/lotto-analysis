import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

type CombinationDraftValue = {
  addNumber: (number: number) => void;
  clear: () => void;
  removeNumber: (number: number) => void;
  selectedNumbers: number[];
  setNumbers: (numbers: readonly number[]) => void;
  toggleNumber: (number: number) => void;
};

const CombinationDraftContext = createContext<CombinationDraftValue | null>(null);
const WEB_DRAFT_KEY = 'lotto.combinationDraft.v1';

export function normalizeDraftNumbers(numbers: readonly number[]) {
  return [...new Set(numbers)]
    .filter((number) => Number.isInteger(number) && number >= 1 && number <= 45)
    .slice(0, 6)
    .sort((left, right) => left - right);
}

export function CombinationDraftProvider({ children }: { children: React.ReactNode }) {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>(() => {
    if (Platform.OS !== 'web' || typeof sessionStorage === 'undefined') return [];
    try {
      const stored = JSON.parse(sessionStorage.getItem(WEB_DRAFT_KEY) ?? '[]') as unknown;
      return Array.isArray(stored) ? normalizeDraftNumbers(stored as number[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(WEB_DRAFT_KEY, JSON.stringify(selectedNumbers));
  }, [selectedNumbers]);
  const setNumbers = useCallback((numbers: readonly number[]) => {
    setSelectedNumbers(normalizeDraftNumbers(numbers));
  }, []);
  const addNumber = useCallback((number: number) => {
    setSelectedNumbers((current) => current.includes(number) || current.length >= 6
      ? current
      : normalizeDraftNumbers([...current, number]));
  }, []);
  const removeNumber = useCallback((number: number) => {
    setSelectedNumbers((current) => current.filter((item) => item !== number));
  }, []);
  const toggleNumber = useCallback((number: number) => {
    setSelectedNumbers((current) => current.includes(number)
      ? current.filter((item) => item !== number)
      : current.length >= 6 ? current : normalizeDraftNumbers([...current, number]));
  }, []);
  const clear = useCallback(() => setSelectedNumbers([]), []);
  const value = useMemo(() => ({ addNumber, clear, removeNumber, selectedNumbers, setNumbers, toggleNumber }),
    [addNumber, clear, removeNumber, selectedNumbers, setNumbers, toggleNumber]);
  return <CombinationDraftContext.Provider value={value}>{children}</CombinationDraftContext.Provider>;
}

export function useCombinationDraft() {
  const value = useContext(CombinationDraftContext);
  if (!value) throw new Error('useCombinationDraft must be used within CombinationDraftProvider.');
  return value;
}
