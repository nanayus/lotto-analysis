import { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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
  | { kind: 'subCombinations'; size: CombinationSize }
  | { kind: 'compareSelect' }
  | { kind: 'comparison' };

export function CombinationScreen() {
  const { clear, selectedNumbers, setNumbers, toggleNumber } = useCombinationDraft();
  const [mode, setMode] = useState<ScreenMode>({ kind: 'select' });
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
  const [comparisonA, setComparisonA] = useState<CombinationAnalysis | null>(null);
  const [comparisonB, setComparisonB] = useState<CombinationAnalysis | null>(null);
  const analysisStateRef = useRef<AnalysisState | null>(null);

  const handleToggleNumber = useCallback((number: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    toggleNumber(number);
  }, [toggleNumber]);

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
            onRandomFill={() => setNumbers(fillCombinationRandomly(selectedNumbers))}
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
              onOpenSubCombinations={(size) => setMode({ kind: 'subCombinations', size })}
              onPeriodChange={changePeriod}
              onStartOver={startOver}
              onCompare={() => { setComparisonA(analysisState.snapshot); setComparisonB(null); clear(); setMode({kind:'compareSelect'}); }}
              period={analysisState.period}
            />
          ) : mode.kind === 'history' || mode.kind === 'prizeRank' || mode.kind === 'subCombinations' ? (
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
  compareBasis:{marginHorizontal:20,marginTop:16,padding:14,borderWidth:1,borderColor:colors.divider,borderRadius:12,backgroundColor:colors.surface},compareLabel:{color:colors.textSecondary,fontSize:12,marginBottom:6},compareNumbers:{color:colors.textPrimary,fontSize:14},
});
