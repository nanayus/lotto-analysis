import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type CombinationDraftValue = {
  addNumber: (number: number) => void;
  clear: () => void;
  removeNumber: (number: number) => void;
  selectedNumbers: number[];
  setNumbers: (numbers: readonly number[]) => void;
  toggleNumber: (number: number) => void;
};

const CombinationDraftContext = createContext<CombinationDraftValue | null>(null);

export function normalizeDraftNumbers(numbers: readonly number[]) {
  return [...new Set(numbers)]
    .filter((number) => Number.isInteger(number) && number >= 1 && number <= 45)
    .slice(0, 6)
    .sort((left, right) => left - right);
}

export function CombinationDraftProvider({ children }: { children: React.ReactNode }) {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
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
