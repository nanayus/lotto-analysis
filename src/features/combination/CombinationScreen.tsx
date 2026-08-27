import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import lottoHistoryJson from '@/data/generated/lotto_history.json';
import type { AnalysisFilters, AnalysisPeriod, LottoHistoryDraw } from '@/domain/analytics/types';
import { analyzeCombination } from '@/domain/combination/analyzeCombination';
import type { CombinationAnalysis, PrizeRank } from '@/domain/combination/types';
import { type ThemeColors, useThemedStyles } from '@/theme';

import { CombinationResult } from './components/CombinationResult';
import { CombinationDetail } from './components/CombinationDetail';
import { NumberSelector } from './components/NumberSelector';
import { useCombinationDraft } from './CombinationDraftContext';
import { fillCombinationRandomly } from './randomFill';
import { CombinationComparison } from './components/CombinationComparison';

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
  | { kind: 'compareSelect' }
  | { kind: 'comparison' };

export function CombinationScreen() {
  const styles = useThemedStyles(createStyles);
  const { analyze } = useLocalSearchParams<{ analyze?: string | string[] }>();
  const { clear, selectedNumbers, setNumbers, toggleNumber } = useCombinationDraft();
  const [excludedNumbers, setExcludedNumbers] = useState<number[]>([]);
  const activeExcludedNumbers = excludedNumbers.filter(
    (number) => !selectedNumbers.includes(number),
  );
  const [mode, setMode] = useState<ScreenMode>({ kind: 'select' });
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
  const [comparisonA, setComparisonA] = useState<CombinationAnalysis | null>(null);
  const [comparisonB, setComparisonB] = useState<CombinationAnalysis | null>(null);
  const analysisStateRef = useRef<AnalysisState | null>(null);
  const handledAnalyzeTokenRef = useRef<string | null>(null);

  const handleToggleNumber = useCallback((number: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    if (selectedNumbers.includes(number)) {
      toggleNumber(number);
      setExcludedNumbers((current) => current.includes(number)
        ? current
        : [...current, number].sort((left, right) => left - right));
      return;
    }
    if (activeExcludedNumbers.includes(number)) {
      setExcludedNumbers((current) => current.filter((item) => item !== number));
      return;
    }
    toggleNumber(number);
  }, [activeExcludedNumbers, selectedNumbers, toggleNumber]);

  const startAnalysis = useCallback(() => {
    if (selectedNumbers.length !== 6) return;
    const filters = mode.kind === 'compareSelect' && analysisState
      ? { includeBonus: analysisState.includeBonus, period: analysisState.period }
      : DEFAULT_FILTERS;
    const snapshot = analyzeCombination(lottoHistory, selectedNumbers, filters);
    const nextState = { ...filters, snapshot };
    analysisStateRef.current = nextState;
    setAnalysisState(nextState);
    if (mode.kind === 'compareSelect' && comparisonA) {
      setComparisonB(snapshot); setMode({ kind: 'comparison' });
    } else setMode({ kind: 'result' });
  }, [analysisState, comparisonA, mode.kind, selectedNumbers]);

  const analyzeToken = Array.isArray(analyze) ? analyze.at(-1) : analyze;
  useEffect(() => {
    if (
      !analyzeToken
      || handledAnalyzeTokenRef.current === analyzeToken
      || selectedNumbers.length !== 6
    ) return;

    handledAnalyzeTokenRef.current = analyzeToken;
    const snapshot = analyzeCombination(lottoHistory, selectedNumbers, DEFAULT_FILTERS);
    const nextState = { ...DEFAULT_FILTERS, snapshot };
    analysisStateRef.current = nextState;
    setAnalysisState(nextState);
    setComparisonA(null);
    setComparisonB(null);
    setExcludedNumbers([]);
    setMode({ kind: 'result' });
  }, [analyzeToken, selectedNumbers]);

  const commitFilters = useCallback((filters: AnalysisFilters) => {
    if (selectedNumbers.length !== 6) return;
    const nextState = {
      ...filters,
      snapshot: analyzeCombination(lottoHistory, selectedNumbers, filters),
    };
    analysisStateRef.current = nextState;
    setAnalysisState(nextState);
    if (mode.kind === 'comparison' && comparisonA && comparisonB) {
      setComparisonA(analyzeCombination(lottoHistory, comparisonA.numbers, filters));
      setComparisonB(analyzeCombination(lottoHistory, comparisonB.numbers, filters));
    }
  }, [comparisonA, comparisonB, mode.kind, selectedNumbers]);

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
    clear();
    setExcludedNumbers([]);
    setMode({ kind: 'select' });
    setComparisonA(null); setComparisonB(null);
  }, [clear]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {mode.kind === 'select' || mode.kind === 'compareSelect' ? (
          <>{mode.kind === 'compareSelect' && comparisonA ? <View style={styles.compareBasis}><Text style={styles.compareLabel}>비교 기준 A</Text><Text style={styles.compareNumbers}>{comparisonA.numbers.map((n)=>String(n).padStart(2,'0')).join(' · ')}</Text></View> : null}
          <NumberSelector
            onAnalyze={startAnalysis}
            excludedNumbers={activeExcludedNumbers}
            onRandomFill={() => setNumbers(fillCombinationRandomly(selectedNumbers, activeExcludedNumbers))}
            onToggleNumber={handleToggleNumber}
            selectedNumbers={selectedNumbers}
          />
          </>
        ) : mode.kind === 'comparison' && comparisonA && comparisonB && analysisState ? (
          <CombinationComparison a={comparisonA} b={comparisonB} bonusIncluded={analysisState.includeBonus} firstRound={firstRound} latestRound={latestRound} onBack={() => setMode({kind:'result'})} onBonusChange={changeBonus} onPeriodChange={changePeriod} period={analysisState.period}/>
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
              onPeriodChange={changePeriod}
              onStartOver={startOver}
              onCompare={() => { setComparisonA(analysisState.snapshot); setComparisonB(null); clear(); setExcludedNumbers([]); setMode({kind:'compareSelect'}); }}
              period={analysisState.period}
            />
          ) : mode.kind === 'history' || mode.kind === 'prizeRank' ? (
            <CombinationDetail
              analysis={analysisState.snapshot}
              mode={mode}
              onBack={() => setMode({ kind: 'result' })}
            />
          ) : null
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  compareBasis:{marginHorizontal:20,marginTop:16,padding:14,borderWidth:1,borderColor:colors.divider,borderRadius:12,backgroundColor:colors.surface},compareLabel:{color:colors.textSecondary,fontSize:12,marginBottom:6},compareNumbers:{color:colors.textPrimary,fontSize:14},
});
