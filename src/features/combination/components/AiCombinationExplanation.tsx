import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import type { CombinationAnalysis } from '@/domain/combination/types';
import { functions as firebaseFunctions } from '@/features/auth/firebaseClient';
import { radius, spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

type AiCombinationExplanationProps = {
  analysis: CombinationAnalysis;
  isPro: boolean;
  onOpenPro: () => void;
  requiresLogin?: boolean;
};

type ConversationItem = {
  answer: string;
  question: string;
};

type AiRequest = {
  analysis: ReturnType<typeof buildAiSnapshot>;
  history: ConversationItem[];
  question: string;
};

type AiResponse = {
  answer: string;
  model: string;
};

const SUGGESTED_QUESTIONS = [
  '가장 눈에 띄는 특징은?',
  '함께 자주 나온 번호는?',
  '선택 번호 출현 빈도는 어때?',
] as const;

const webPointerStyle = Platform.select({
  web: { cursor: 'pointer' } as unknown as ViewStyle,
});

function formatNumbers(numbers: readonly number[]) {
  return numbers.map((number) => String(number).padStart(2, '0')).join(' · ');
}

function periodLabel(analysis: CombinationAnalysis) {
  return analysis.filters.period.kind === 'preset'
    ? analysis.filters.period.label
    : `${analysis.filters.period.startRound}–${analysis.filters.period.endRound}회`;
}

function buildAiSnapshot(analysis: CombinationAnalysis) {
  const topCombinations = (size: 2 | 3 | 4 | 5 | 6) => analysis.subCombinations[size]
    .filter((item) => item.appearanceCount > 0)
    .slice(0, 5);
  return {
    activeDrawCount: analysis.activeDrawCount,
    conditionMetrics: analysis.conditionMetrics,
    filters: analysis.filters,
    groupFrequency: analysis.groupFrequency,
    highestMainMatch: analysis.highestMainMatch,
    individualNumbers: analysis.individualNumbers,
    matchDistribution: analysis.matchDistribution,
    numbers: analysis.numbers,
    prizeCounts: analysis.prizeCounts,
    recentMeaningfulMatch: analysis.recentMeaningfulMatch ? {
      bonusMatched: analysis.recentMeaningfulMatch.bonusMatched,
      mainMatchCount: analysis.recentMeaningfulMatch.mainMatchCount,
      matchedMainNumbers: analysis.recentMeaningfulMatch.matchedMainNumbers,
      prizeRank: analysis.recentMeaningfulMatch.prizeRank,
      round: analysis.recentMeaningfulMatch.round,
    } : null,
    sameSixCount: analysis.sameSixCount,
    shape: analysis.shape,
    shapeDistribution: analysis.shapeDistribution,
    topSubCombinations: {
      2: topCombinations(2),
      3: topCombinations(3),
      4: topCombinations(4),
      5: topCombinations(5),
      6: topCombinations(6),
    },
  };
}

export function AiCombinationExplanation({
  analysis,
  isPro,
  onOpenPro,
  requiresLogin = false,
}: AiCombinationExplanationProps) {
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [overview, setOverview] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestAnswer = async (question: string, history: ConversationItem[]) => {
    if (!firebaseFunctions) throw new Error('AI 해설 서버 연결 정보가 필요해요.');
    const askCombinationAi = httpsCallable<AiRequest, AiResponse>(
      firebaseFunctions,
      'askCombinationAi',
    );
    const result = await askCombinationAi({
      analysis: buildAiSnapshot(analysis),
      history,
      question,
    });
    return result.data.answer;
  };

  const loadOverview = async () => {
    if (overview || pendingQuestion) return;
    const question = '이 조합에서 눈에 띄는 과거 통계 특징을 세 가지로 요약해 줘.';
    setPendingQuestion(question);
    setErrorMessage(null);
    try {
      setOverview(await requestAnswer(question, []));
    } catch (error) {
      setErrorMessage((error as Error).message || 'AI 해설을 불러오지 못했어요.');
    } finally {
      setPendingQuestion(null);
    }
  };

  const open = () => {
    if (!isPro) {
      onOpenPro();
      return;
    }
    setVisible(true);
    queueMicrotask(() => void loadOverview());
  };

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || pendingQuestion) return;
    setDraft('');
    setPendingQuestion(trimmed);
    setErrorMessage(null);
    try {
      const answer = await requestAnswer(trimmed, conversation);
      setConversation((current) => [...current, { answer, question: trimmed }]);
    } catch (error) {
      setErrorMessage((error as Error).message || '답변을 불러오지 못했어요.');
    } finally {
      setPendingQuestion(null);
    }
  };

  return (
    <>
      <Pressable
        accessibilityLabel={isPro
          ? 'AI로 쉽게 보기, 설명 보기'
          : requiresLogin
            ? 'AI로 쉽게 보기, 로그인 필요'
            : 'AI로 쉽게 보기, 설명 보기, Pro 전용'}
        accessibilityRole="button"
        onPress={open}
        style={({ pressed }) => [webPointerStyle, pressed && styles.pressed]}>
        <AppCard style={styles.card} testID="ai-combination-explanation-card">
          <View style={styles.cardHeading}>
            <View style={styles.cardIconBox}>
              <Ionicons
                color={styles.cardIconColor.color}
                name="sparkles"
                size={17}
              />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>AI로 쉽게 보기</Text>
              <Text style={styles.cardDescription}>이 결과를 쉬운 말로 풀어드려요.</Text>
            </View>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>설명 보기</Text>
            </View>
          </View>
        </AppCard>
      </Pressable>

      <Modal animationType="slide" onRequestClose={() => setVisible(false)} transparent visible={visible}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="AI 조합 해설 닫기"
            onPress={() => setVisible(false)}
            style={styles.backdrop}
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleGroup}>
                <View style={styles.iconBox}>
                  <Ionicons color={styles.iconColor.color} name="sparkles" size={17} />
                </View>
                <View>
                  <Text style={styles.sheetTitle}>AI 조합 해설</Text>
                  <Text style={styles.sheetMeta}>{formatNumbers(analysis.numbers)} · {periodLabel(analysis)}</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="닫기"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setVisible(false)}
                style={({ pressed }) => [webPointerStyle, pressed && styles.pressed]}>
                <Ionicons color={styles.closeColor.color} name="close" size={22} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.aiBubble}>
                <View style={styles.summaryHeading}>
                  <View style={styles.summaryIcon}>
                    <Ionicons color={styles.iconColor.color} name="sparkles" size={14} />
                  </View>
                  <Text style={styles.aiEyebrow}>AI 요약</Text>
                </View>
                {overview ? (
                  <Text style={styles.overviewText}>{overview}</Text>
                ) : pendingQuestion ? (
                  <View style={styles.loadingRow}>
                    <View style={styles.loadingDot} />
                    <Text style={styles.loadingText}>분석 결과를 읽고 있어요…</Text>
                  </View>
                ) : (
                  <AppButton
                    accessibilityLabel="AI 해설 다시 불러오기"
                    label="AI 해설 다시 불러오기"
                    onPress={() => void loadOverview()}
                    variant="secondary"
                  />
                )}
              </View>

              <Text style={styles.questionHeading}>이어서 물어보세요</Text>
              <View style={styles.suggestions}>
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <Pressable
                    accessibilityRole="button"
                    key={question}
                    disabled={Boolean(pendingQuestion)}
                    onPress={() => void ask(question)}
                    style={({ pressed }) => [
                      styles.suggestion,
                      index < SUGGESTED_QUESTIONS.length - 1 && styles.suggestionDivider,
                      webPointerStyle,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.suggestionText}>{question}</Text>
                    <Ionicons color={styles.chevronColor.color} name="chevron-forward" size={17} />
                  </Pressable>
                ))}
              </View>

              {conversation.map((item, index) => (
                <View key={`${item.question}-${index}`} style={styles.exchange}>
                  <View style={styles.userBubble}><Text style={styles.userText}>{item.question}</Text></View>
                  <View style={styles.aiAnswer}>
                    <View style={styles.aiAnswerTail} />
                    <View style={styles.answerHeading}>
                      <Ionicons color={styles.iconColor.color} name="sparkles" size={13} />
                      <Text style={styles.answerLabel}>AI 해설</Text>
                    </View>
                    <Text style={styles.answerText}>{item.answer}</Text>
                  </View>
                </View>
              ))}

              {pendingQuestion && overview ? (
                <View style={styles.exchange}>
                  <View style={styles.userBubble}><Text style={styles.userText}>{pendingQuestion}</Text></View>
                  <View style={styles.aiAnswer}>
                    <View style={styles.aiAnswerTail} />
                    <Text style={styles.loadingText}>답변을 생각하고 있어요…</Text>
                  </View>
                </View>
              ) : null}

              {errorMessage ? (
                <View accessibilityRole="alert" style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Text style={styles.disclaimer}>
                과거 통계를 설명하는 기능이며 미래 당첨 번호나 가능성을 예측하지 않습니다.
              </Text>
            </ScrollView>

            <View style={styles.composer}>
              <TextInput
                accessibilityLabel="AI에게 질문하기"
                onChangeText={setDraft}
                editable={!pendingQuestion}
                maxLength={300}
                onSubmitEditing={() => void ask(draft)}
                placeholder="이 조합에 대해 질문하기"
                placeholderTextColor={styles.placeholderColor.color}
                returnKeyType="send"
                style={styles.input}
                value={draft}
              />
              <Pressable
                accessibilityLabel="질문 보내기"
                accessibilityRole="button"
                accessibilityState={{ disabled: !draft.trim() || Boolean(pendingQuestion) }}
                disabled={!draft.trim() || Boolean(pendingQuestion)}
                onPress={() => void ask(draft)}
                style={({ pressed }) => [
                  styles.sendButton,
                  (!draft.trim() || pendingQuestion) && styles.sendButtonDisabled,
                  webPointerStyle,
                  pressed && styles.pressed,
                ]}>
                <Ionicons color={styles.sendIconColor.color} name="arrow-up" size={18} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  pressed: { opacity: 0.82 },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  cardIconColor: { color: colors.accentPrimary },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surfaceAccent,
  },
  iconColor: { color: colors.accentPrimary },
  chevronColor: { color: colors.textTertiary },
  closeColor: { color: colors.textSecondary },
  placeholderColor: { color: colors.textTertiary },
  sendIconColor: { color: '#FFFFFF' },
  cardCopy: { flex: 1 },
  cardAction: {
    minHeight: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface,
  },
  cardActionText: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  cardDescription: {
    marginTop: spacing.xs,
    color: colors.textTertiary,
    fontSize: typography.sizes.caption,
    lineHeight: 18,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdropStrong },
  sheet: {
    width: '100%',
    maxWidth: 500,
    height: '88%',
    alignSelf: 'center',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  handle: {
    width: 34,
    height: 4,
    alignSelf: 'center',
    marginTop: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.divider,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sheetTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.semibold,
  },
  sheetMeta: { marginTop: spacing.xs, color: colors.textTertiary, fontSize: typography.sizes.caption },
  sheetContent: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
  aiBubble: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentPrimary,
    backgroundColor: colors.surfaceAccent,
    gap: spacing.md,
  },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surface,
  },
  aiEyebrow: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  overviewText: { color: colors.textPrimary, fontSize: typography.sizes.small, lineHeight: 22 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: radius.round,
    backgroundColor: colors.accentPrimary,
  },
  loadingText: { color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 18 },
  questionHeading: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  suggestions: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  suggestion: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  suggestionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  suggestionText: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.small },
  exchange: { gap: spacing.sm, marginTop: spacing.sm },
  userBubble: {
    maxWidth: '88%',
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderBottomRightRadius: spacing.xs,
    backgroundColor: colors.accentPrimary,
  },
  userText: { color: '#FFFFFF', fontSize: typography.sizes.small, lineHeight: 21 },
  aiAnswer: {
    position: 'relative',
    maxWidth: '92%',
    alignSelf: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderBottomLeftRadius: spacing.xs,
    backgroundColor: colors.surfaceElevated,
  },
  aiAnswerTail: {
    position: 'absolute',
    left: -7,
    bottom: 0,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderRightColor: colors.surfaceElevated,
  },
  answerHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  answerLabel: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  answerText: { marginTop: spacing.sm, color: colors.textPrimary, fontSize: typography.sizes.small, lineHeight: 22 },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceDanger,
  },
  errorText: { color: colors.hot, fontSize: typography.sizes.caption, lineHeight: 18 },
  disclaimer: { color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 18, textAlign: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.accentPrimary,
  },
  sendButtonDisabled: { opacity: 0.35 },
});
