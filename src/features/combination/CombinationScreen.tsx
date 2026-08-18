import { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import lottoHistoryJson from '@/data/generated/lotto_history.json';
import type { AnalysisFilters, AnalysisPeriod, LottoHistoryDraw } from '@/domain/analytics/types';
import { analyzeCombination } from '@/domain/combination/analyzeCombination';
import type { CombinationAnalysis, CombinationSize, PrizeRank } from '@/domain/combination/types';
import { colors } from '@/theme';

import { CombinationResult } from './components/CombinationResult';
import { CombinationDetail } from './components/CombinationDetail';
import { NumberSelector } from './components/NumberSelector';

const lottoHistory = lottoHistoryJson as LottoHistoryDraw[];
const firstRound = Math.min(...lottoHistory.map((draw) => draw.round));
const latestRound = Math.max(...lottoHistory.map((draw) => draw.round));

const DEFAULT_FILTERS: AnalysisFilters = {
  includeBonus: false,
  period: { kind: 'preset', label: '전체' },
};

type AnalysisState = AnalysisFilters & {
  snapshot: CombinationAnalysis;
};

type ScreenMode =
  | { kind: 'select' }
  | { kind: 'result' }
  | { kind: 'history' }
  | { kind: 'prizeRank'; rank: PrizeRank }
  | { kind: 'subCombinations'; size: CombinationSize };

export function CombinationScreen() {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [mode, setMode] = useState<ScreenMode>({ kind: 'select' });
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
  const analysisStateRef = useRef<AnalysisState | null>(null);

  const toggleNumber = useCallback((number: number) => {
    setSelectedNumbers((current) => {
      const isSelected = current.includes(number);
      if (!isSelected && current.length >= 6) return current;
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      return isSelected
        ? current.filter((item) => item !== number)
        : [...current, number].sort((left, right) => left - right);
    });
  }, []);

  const startAnalysis = useCallback(() => {
    if (selectedNumbers.length !== 6) return;
    const snapshot = analyzeCombination(lottoHistory, selectedNumbers, DEFAULT_FILTERS);
    const nextState = { ...DEFAULT_FILTERS, snapshot };
    analysisStateRef.current = nextState;
    setAnalysisState(nextState);
    setMode({ kind: 'result' });
  }, [selectedNumbers]);

  const commitFilters = useCallback((filters: AnalysisFilters) => {
    if (selectedNumbers.length !== 6) return;
    const nextState = {
      ...filters,
      snapshot: analyzeCombination(lottoHistory, selectedNumbers, filters),
    };
    analysisStateRef.current = nextState;
    setAnalysisState(nextState);
  }, [selectedNumbers]);

  const changePeriod = useCallback((period: AnalysisPeriod) => {
    const current = analysisStateRef.current;
    if (!current) return;
    commitFilters({ includeBonus: current.includeBonus, period });
  }, [commitFilters]);

  const changeBonus = useCallback((includeBonus: boolean) => {
    const current = analysisStateRef.current;
    if (!current) return;
    commitFilters({ includeBonus, period: current.period });
  }, [commitFilters]);

  const startOver = useCallback(() => {
    analysisStateRef.current = null;
    setAnalysisState(null);
    setSelectedNumbers([]);
    setMode({ kind: 'select' });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {mode.kind === 'select' ? (
          <NumberSelector
            onAnalyze={startAnalysis}
            onToggleNumber={toggleNumber}
            selectedNumbers={selectedNumbers}
          />
        ) : analysisState ? (
          mode.kind === 'result' ? (
            <CombinationResult
              analysis={analysisState.snapshot}
              bonusIncluded={analysisState.includeBonus}
              firstRound={firstRound}
              latestRound={latestRound}
              onBonusChange={changeBonus}
              onOpenHistory={() => setMode({ kind: 'history' })}
              onOpenPrizeRank={(rank) => setMode({ kind: 'prizeRank', rank })}
              onOpenSubCombinations={(size) => setMode({ kind: 'subCombinations', size })}
              onPeriodChange={changePeriod}
              onStartOver={startOver}
              period={analysisState.period}
            />
          ) : (
            <CombinationDetail
              analysis={analysisState.snapshot}
              mode={mode}
              onBack={() => setMode({ kind: 'result' })}
            />
          )
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    backgroundColor: colors.background,
  },
});
