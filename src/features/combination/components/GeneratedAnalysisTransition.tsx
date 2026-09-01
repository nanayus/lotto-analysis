import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SubScreenHeader } from '@/components/ui/AppTopBar';
import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

import { AnalysisNumberShuffle } from './AccessNumberShuffle';
import { CombinationNumberPills } from './CombinationNumberPills';

export type GeneratedAnalysisPhase = 'access' | 'error' | 'invalid' | 'loading' | 'login';

type GeneratedAnalysisTransitionProps = {
  errorMessage?: string | null;
  numbers: readonly number[];
  onBack: () => void;
  onContinue: () => void;
  onLater: () => void;
  onOpenPro: () => void;
  onWatchAd: () => void;
  phase: GeneratedAnalysisPhase;
  rewardedAdAvailable: boolean;
  rewardedAdLoading: boolean;
};

const COPY = {
  access: {
    description: '광고 한 편을 본 뒤 완전한 분석 결과를 열거나, Pro에서 바로 확인할 수 있어요.',
    title: '결과를 여는 방법을 선택하세요',
  },
  error: {
    description: '연결 상태를 확인하고 다시 시도해 주세요.',
    title: '분석을 시작하지 못했어요',
  },
  invalid: {
    description: '분석할 번호 정보가 없거나 만료되었어요. 번호를 다시 선택해 주세요.',
    title: '분석할 번호를 찾지 못했어요',
  },
  loading: {
    description: '선택한 번호의 과거 기록을 확인한 뒤 결과를 바로 열어요.',
    title: '분석하고 있습니다',
  },
  login: {
    description: '로그인하면 더 많은 조합을 선택하고 내 번호를 이 기기에 저장할 수 있어요.',
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
  onWatchAd,
  phase,
  rewardedAdAvailable,
  rewardedAdLoading,
}: GeneratedAnalysisTransitionProps) {
  const styles = useThemedStyles(createStyles);
  const copy = COPY[phase];
  const actionLabel = phase === 'login'
    ? '로그인하고 계속'
    : phase === 'invalid'
      ? '번호 다시 선택하기'
      : '다시 시도';

  return (
    <View style={styles.root} testID="generated-analysis-transition">
      <SubScreenHeader onBack={onBack} title="조합 분석" />

      <View style={styles.content}>
        <View style={styles.statusIcon}>
          {phase === 'loading' ? (
            <ActivityIndicator color={styles.iconColor.color} size="small" />
          ) : (
            <Ionicons
              color={styles.iconColor.color}
              name={phase === 'error' || phase === 'invalid'
                ? 'alert-circle-outline'
                : phase === 'login' ? 'person-outline' : 'play-circle-outline'}
              size={25}
            />
          )}
        </View>
        <Text style={styles.eyebrow}>HISTORICAL ANALYSIS</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.description}>{errorMessage || copy.description}</Text>

        {phase === 'access' || phase === 'loading' ? (
          <AppCard style={styles.numberCard}>
            <AnalysisNumberShuffle testID={`${phase}-number-shuffle`} />
          </AppCard>
        ) : numbers.length > 0 ? (
          <AppCard style={styles.numberCard}>
            <CombinationNumberPills
              accessibilityLabel={`분석할 번호 ${numbers.join(', ')}`}
              numbers={numbers}
            />
          </AppCard>
        ) : null}

        {phase === 'access' ? (
          <View style={styles.accessActions}>
            <AppButton label="Pro 살펴보기" onPress={onOpenPro} />
            <Pressable
              accessibilityLabel={rewardedAdLoading
                ? '광고 확인 중'
                : rewardedAdAvailable ? '광고 보고 이번 결과 보기' : '광고를 불러올 수 없음'}
              accessibilityRole="button"
              accessibilityState={{ disabled: rewardedAdLoading || !rewardedAdAvailable }}
              disabled={rewardedAdLoading || !rewardedAdAvailable}
              onPress={onWatchAd}
              style={({ pressed }) => [
                styles.rewardButton,
                (!rewardedAdAvailable || rewardedAdLoading) && styles.rewardButtonDisabled,
                pressed && styles.pressed,
              ]}>
              {rewardedAdLoading ? (
                <ActivityIndicator color={styles.rewardIcon.color} size="small" />
              ) : (
                <Ionicons color={styles.rewardIcon.color} name="play-circle-outline" size={20} />
              )}
              <Text style={styles.rewardButtonText}>
                {rewardedAdLoading ? '광고 확인 중' : '광고 보고 이번 결과 보기'}
              </Text>
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
  content: { flex: 1, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', paddingBottom: 72 },
  statusIcon: { width: 52, height: 52, marginBottom: spacing.lg, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAccent },
  iconColor: { color: colors.accentPrimary },
  eyebrow: { color: colors.accentPrimary, fontSize: 9, fontWeight: typography.weights.bold, letterSpacing: 1.6 },
  title: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold, textAlign: 'center' },
  description: { maxWidth: 330, marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, textAlign: 'center' },
  numberCard: { width: '100%', marginTop: spacing.xl, padding: spacing.lg },
  action: { width: '100%', marginTop: spacing.xl },
  accessActions: { width: '100%', marginTop: spacing.xl, gap: spacing.sm },
  rewardButton: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: radius.round, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAccent },
  rewardButtonDisabled: { opacity: 0.52 },
  rewardIcon: { color: colors.accentPrimary },
  rewardButtonText: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  laterButton: { height: 42, alignItems: 'center', justifyContent: 'center' },
  laterText: { color: colors.textSecondary, fontSize: typography.sizes.small },
  pressed: { opacity: 0.7 },
});
