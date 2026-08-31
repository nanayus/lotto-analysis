import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SubScreenBackButton } from '@/components/ui/SubScreenBackButton';
import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

import { CombinationNumberPills } from './CombinationNumberPills';

export type GeneratedAnalysisPhase = 'access' | 'error' | 'loading' | 'login';

const BALL_REVEAL_INTERVAL_MS = 90;

function RevealingCombinationNumberPills({ numbers }: { numbers: readonly number[] }) {
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    const timers = numbers.map((_, index) => setTimeout(
      () => setRevealedCount(index + 1),
      (index + 1) * BALL_REVEAL_INTERVAL_MS,
    ));
    return () => timers.forEach(clearTimeout);
  }, [numbers]);

  return (
    <CombinationNumberPills
      accessibilityLabel={`분석할 번호 ${numbers.join(', ')}`}
      numbers={numbers}
      revealedCount={revealedCount}
    />
  );
}

type GeneratedAnalysisTransitionProps = {
  errorMessage?: string | null;
  numbers: readonly number[];
  onBack: () => void;
  onContinue: () => void;
  onLater: () => void;
  onOpenPro: () => void;
  phase: GeneratedAnalysisPhase;
};

const COPY = {
  access: {
    description: '광고 한 편으로 이번 결과를 열거나, Pro에서 제한 없이 분석할 수 있어요.',
    title: '분석 이용권이 필요해요',
  },
  error: {
    description: '연결 상태를 확인하고 다시 시도해 주세요.',
    title: '분석을 시작하지 못했어요',
  },
  loading: {
    description: '로그인과 분석 이용 가능 횟수를 확인한 뒤 결과를 바로 열어요.',
    title: '분석을 준비하고 있어요',
  },
  login: {
    description: '로그인하면 분석 이용 가능 횟수를 확인하고 결과를 바로 열어요.',
    title: '로그인이 필요해요',
  },
} as const;

export function GeneratedAnalysisTransition({
  errorMessage,
  numbers,
  onBack,
  onContinue,
  onLater,
  onOpenPro,
  phase,
}: GeneratedAnalysisTransitionProps) {
  const styles = useThemedStyles(createStyles);
  const copy = COPY[phase];
  const actionLabel = phase === 'login'
    ? '로그인하고 계속'
    : '다시 시도';

  return (
    <View style={styles.root} testID="generated-analysis-transition">
      <View style={styles.header}>
        <SubScreenBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>조합 분석</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.statusIcon}>
          {phase === 'loading' ? (
            <ActivityIndicator color={styles.iconColor.color} size="small" />
          ) : (
            <Ionicons
              color={styles.iconColor.color}
              name={phase === 'error' ? 'alert-circle-outline' : phase === 'login' ? 'person-outline' : 'ticket-outline'}
              size={25}
            />
          )}
        </View>
        <Text style={styles.eyebrow}>HISTORICAL ANALYSIS</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.description}>{errorMessage || copy.description}</Text>

        <AppCard style={styles.numberCard}>
          {phase === 'loading' ? (
            <RevealingCombinationNumberPills numbers={numbers} />
          ) : (
            <CombinationNumberPills
              accessibilityLabel={`분석할 번호 ${numbers.join(', ')}`}
              numbers={numbers}
            />
          )}
        </AppCard>

        {phase === 'access' ? (
          <View style={styles.accessActions}>
            <AppButton label="Pro 살펴보기" onPress={onOpenPro} />
            <Pressable
              accessibilityLabel="광고 보고 이번 결과 보기, 연결 준비 중"
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              disabled
              style={styles.rewardButtonDisabled}>
              <Ionicons color={styles.rewardIcon.color} name="play-circle-outline" size={20} />
              <Text style={styles.rewardButtonText}>광고 보고 이번 결과 보기</Text>
              <Text style={styles.rewardStatus}>준비 중</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onLater}
              style={({ pressed }) => [styles.laterButton, pressed && styles.pressed]}>
              <Text style={styles.laterText}>다음에 하기</Text>
            </Pressable>
          </View>
        ) : phase !== 'loading' ? (
          <AppButton label={actionLabel} onPress={onContinue} style={styles.action} />
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 68, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  headerTitle: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, textAlign: 'center' },
  headerSpacer: { width: 44, height: 44 },
  content: { flex: 1, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', paddingBottom: 72 },
  statusIcon: { width: 52, height: 52, marginBottom: spacing.lg, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAccent },
  iconColor: { color: colors.accentPrimary },
  eyebrow: { color: colors.accentPrimary, fontSize: 9, fontWeight: typography.weights.bold, letterSpacing: 1.6 },
  title: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold, textAlign: 'center' },
  description: { maxWidth: 330, marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, textAlign: 'center' },
  numberCard: { width: '100%', marginTop: spacing.xl, padding: spacing.lg },
  action: { width: '100%', marginTop: spacing.xl },
  accessActions: { width: '100%', marginTop: spacing.xl, gap: spacing.sm },
  rewardButtonDisabled: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: radius.round, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAccent, opacity: 0.68 },
  rewardIcon: { color: colors.accentPrimary },
  rewardButtonText: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  rewardStatus: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.round, color: colors.textTertiary, fontSize: 10, fontWeight: typography.weights.semibold, backgroundColor: colors.surface },
  laterButton: { height: 42, alignItems: 'center', justifyContent: 'center' },
  laterText: { color: colors.textSecondary, fontSize: typography.sizes.small },
  pressed: { opacity: 0.7 },
});
