import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CombinationAnalysis, CombinationSize, PrizeRank } from '@/domain/combination/types';
import { colors, radius, spacing, typography } from '@/theme';

type DetailMode =
  | { kind: 'history' }
  | { kind: 'prizeRank'; rank: PrizeRank }
  | { kind: 'subCombinations'; size: CombinationSize };

type CombinationDetailProps = {
  analysis: CombinationAnalysis;
  mode: DetailMode;
  onBack: () => void;
};

function formatNumber(number: number) {
  return String(number).padStart(2, '0');
}

function WinningNumbers({ analysis, draw }: {
  analysis: CombinationAnalysis;
  draw: CombinationAnalysis['qualifyingHistory'][number];
}) {
  const selectedNumbers = new Set(analysis.numbers);
  const bonusMatched = draw.prizeRank === 2;

  return (
    <View style={styles.winningRow}>
      <View style={styles.numbers}>
        {draw.numbers.map((number) => {
          const matched = selectedNumbers.has(number);
          return (
            <View key={number} style={[styles.number, matched && styles.numberAccent]}>
              <Text style={[styles.numberText, matched && styles.numberTextAccent]}>
                {formatNumber(number)}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.bonusSeparator} />
      <View style={[styles.bonusNumber, bonusMatched && styles.numberAccent]}>
        <Text style={[styles.bonusText, bonusMatched && styles.numberTextAccent]}>
          B {formatNumber(draw.bonus)}
        </Text>
      </View>
    </View>
  );
}

function matchLabel(rank: PrizeRank | null, mainMatchCount: number) {
  if (rank === 2) return '2등 상당 · 5개 + 보너스';
  return rank ? `${rank}등 상당 · ${mainMatchCount}개 일치` : `${mainMatchCount}개 일치`;
}

export function CombinationDetail({ analysis, mode, onBack }: CombinationDetailProps) {
  const isHistory = mode.kind !== 'subCombinations';
  const history = mode.kind === 'prizeRank'
    ? analysis.qualifyingHistory.filter((draw) => draw.prizeRank === mode.rank)
    : analysis.qualifyingHistory;
  const title = mode.kind === 'history'
    ? '전체 기록 보기'
    : mode.kind === 'prizeRank'
      ? `${mode.rank}등 기록`
      : `${mode.size}개 조합 전체 보기`;
  const historySummary = mode.kind === 'prizeRank'
    ? mode.rank === 2
      ? '본번호 5개 + 보너스 일치'
      : `본번호 ${mode.rank === 1 ? 6 : 8 - mode.rank}개 일치`
    : '3개 이상 본번호 일치';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="분석 결과로 돌아가기"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isHistory ? (
          <>
            <View style={styles.listSummary}>
              <Text style={styles.summaryText}>{historySummary}</Text>
              <Text style={styles.summaryValue}>총 {history.length}회</Text>
            </View>
            {history.length ? history.map((draw) => (
              <View key={draw.round} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.round}>{draw.round}회</Text>
                  <Text style={styles.matchLabel}>
                    {matchLabel(draw.prizeRank, draw.mainMatchCount)}
                  </Text>
                </View>
                <Text style={styles.fieldLabel}>당첨번호</Text>
                <WinningNumbers analysis={analysis} draw={draw} />
              </View>
            )) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>해당 기록이 없습니다.</Text>
                <Text style={styles.emptyDescription}>선택한 기간에 해당하는 회차가 없습니다.</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.listSummary}>
              <Text style={styles.summaryText}>출현 횟수순 · 동률 시 최근 회차순</Text>
              <Text style={styles.summaryValue}>전체 {analysis.subCombinations[mode.size].length}개</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.rankColumn]}>순위</Text>
              <Text style={[styles.tableHeaderText, styles.combinationColumn]}>조합</Text>
              <Text style={[styles.tableHeaderText, styles.countColumn]}>출현</Text>
              <Text style={[styles.tableHeaderText, styles.latestColumn]}>최근</Text>
            </View>
            {analysis.subCombinations[mode.size].map((item, index) => (
              <View key={item.numbers.join('-')} style={styles.comboRow}>
                <Text style={[styles.comboRank, styles.rankColumn]}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <Text numberOfLines={1} style={[styles.comboNumbers, styles.combinationColumn]}>
                  {item.numbers.map(formatNumber).join(' · ')}
                </Text>
                <Text style={[styles.comboCount, styles.countColumn, item.appearanceCount === 0 && styles.comboCountZero]}>
                  {item.appearanceCount}회
                </Text>
                <Text style={[styles.comboLatest, styles.latestColumn]}>
                  {item.latestRound ? `${item.latestRound}회` : '—'}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    paddingHorizontal: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: typography.weights.regular,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  pressed: {
    opacity: 0.6,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  listSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  round: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  matchLabel: {
    color: colors.highlight,
    fontSize: typography.sizes.small,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    marginBottom: spacing.sm,
  },
  numbers: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  number: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: '#0D101A',
  },
  numberAccent: {
    borderColor: '#35408A',
    backgroundColor: '#171E48',
  },
  numberText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  numberTextAccent: {
    color: colors.accentPrimary,
  },
  winningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bonusSeparator: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.xs,
  },
  bonusNumber: {
    minWidth: 42,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  bonusText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 30,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  tableHeaderText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
  },
  comboRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rankColumn: {
    width: 42,
  },
  combinationColumn: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  countColumn: {
    width: 52,
    textAlign: 'right',
  },
  latestColumn: {
    width: 64,
    textAlign: 'right',
  },
  comboRank: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
  },
  comboNumbers: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
  comboLatest: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
  },
  comboCount: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  comboCountZero: {
    color: colors.textSecondary,
  },
});
