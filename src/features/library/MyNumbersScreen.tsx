import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CombinationNumberRow } from '@/components/ui/CombinationNumberRow';
import { MainTabHeader } from '@/components/ui/AppTopBar';
import { generateCombination } from '@/domain/generator/combinationGenerator';
import { describeGeneratorConditions } from '@/domain/generator/describeGeneratorConditions';
import { COMBINATION_ANALYSIS_ROUTE } from '@/features/combination/combinationNavigation';
import { useCombinationDraft } from '@/features/combination/CombinationDraftContext';
import { useAuth } from '@/features/auth/AuthContext';
import { ACCOUNT_LINKING_ENABLED } from '@/features/auth/featureFlags';
import { type SavedCombination, useNumberLibrary } from '@/features/library/NumberLibraryContext';
import { useMonetization } from '@/features/monetization/MonetizationContext';
import { useLottoData } from '@/features/lotto-data/LottoDataContext';
import { useAutoHideTabBar } from '@/navigation/tabBarVisibility';
import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

import { LibraryStatusActions } from './components/LibraryStatusActions';

type LibraryTab = 'all' | 'purchased' | 'favorite';

const TABS: readonly { label: string; value: LibraryTab }[] = [
  { label: '전체', value: 'all' },
  { label: '구매번호', value: 'purchased' },
  { label: '즐겨찾기', value: 'favorite' },
];

function formatSavedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function MyNumbersScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const tabBarScrollProps = useAutoHideTabBar();
  const { width } = useWindowDimensions();
  const useStackedAnalysisAction = width < 430;
  const { addCombination, combinations, isReady, storageMode, toggleFavorite, togglePurchased } = useNumberLibrary();
  const { openPaywall, productAccess, proPlanEnabled = true } = useMonetization();
  const { openLogin, state: authState } = useAuth();
  const { setNumbers } = useCombinationDraft();
  const { history: lottoHistory } = useLottoData();
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [expandedConditionId, setExpandedConditionId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenerationErrorId, setRegenerationErrorId] = useState<string | null>(null);
  const visibleItems = useMemo(() => combinations.filter((item) => (
    activeTab === 'all' || (activeTab === 'purchased' ? item.purchased : item.favorite)
  )), [activeTab, combinations]);

  const analyze = useCallback((item: SavedCombination) => {
    setNumbers(item.numbers);
    router.push({
      pathname: COMBINATION_ANALYSIS_ROUTE,
      params: {
        analyze: `library-${item.id}`,
        returnTo: 'my-numbers',
      },
    });
  }, [setNumbers]);

  const toggle = useCallback((action: () => void) => {
    action();
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  }, []);

  const regenerate = useCallback(async (item: SavedCombination) => {
    if (!item.generatorConditions || regeneratingId) return;
    setRegeneratingId(item.id);
    setRegenerationErrorId(null);
    try {
      const outcome = await generateCombination(item.generatorConditions, { history: lottoHistory });
      const generatedId = addCombination(outcome.numbers, 'ai', {
        generationConditions: describeGeneratorConditions(item.generatorConditions),
        generatorConditions: item.generatorConditions,
      });
      setNumbers(outcome.numbers);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.push({
        pathname: COMBINATION_ANALYSIS_ROUTE,
        params: {
          analyze: generatedId ? `library-${generatedId}` : `library-regenerated-${Date.now()}`,
          returnTo: 'my-numbers',
        },
      });
    } catch {
      setRegenerationErrorId(item.id);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setRegeneratingId(null);
    }
  }, [addCombination, lottoHistory, regeneratingId, setNumbers]);
  const requestRegenerate = useCallback((item: SavedCombination) => {
    if (!productAccess.canRegenerateWithSameConditions) {
      openPaywall('same-condition-regeneration');
      return;
    }
    void regenerate(item);
  }, [openPaywall, productAccess.canRegenerateWithSameConditions, regenerate]);

  const emptyCopy = activeTab === 'purchased'
    ? ['구매한 번호가 없어요', '뽑은 조합에서 구매 표시를 해보세요.']
    : activeTab === 'favorite'
      ? ['즐겨찾기한 조합이 없어요', '마음에 드는 조합을 따로 모아볼 수 있어요.']
      : ['아직 뽑은 번호가 없어요', '번호뽑기에서 첫 조합을 만들어보세요.'];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <MainTabHeader />
        <ScrollView
          {...tabBarScrollProps}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.storageNotice}>
            <Ionicons
              color={colors.accentPrimary}
              name={storageMode === 'cloud' ? 'cloud-done-outline' : 'phone-portrait-outline'}
              size={16}
            />
            <Text style={styles.storageNoticeText}>
              {storageMode === 'cloud'
                ? '클라우드에 저장되어 다른 기기와 동기화돼요.'
                : '이 기기에만 저장돼요.'}
            </Text>
            {storageMode === 'device' && (proPlanEnabled || ACCOUNT_LINKING_ENABLED) ? (
              <Pressable onPress={() => {
                if (proPlanEnabled) openPaywall('library-cloud');
                else openLogin('library-cloud');
              }}>
                <Text style={styles.storageNoticeAction}>
                  {proPlanEnabled ? 'Pro' : authState.status !== 'authenticated' ? '로그인' : '확인'}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View accessibilityRole="tablist" style={styles.tabs}>
            {TABS.map((tab) => {
              const selected = activeTab === tab.value;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={tab.value}
                  onPress={() => setActiveTab(tab.value)}
                  style={[styles.tab, selected && styles.tabSelected]}>
                  <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.content}>
            {!isReady ? (
            <Text style={styles.loading}>저장된 번호를 불러오고 있어요.</Text>
          ) : visibleItems.length ? (
            <View style={styles.list}>
              {visibleItems.map((item, index) => {
                const conditionsExpanded = expandedConditionId === item.id;
                const conditionCount = item.generationConditions?.length;
                return (
                  <View key={`${item.id}-${index}`} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.metaRow}>
                        <View style={[styles.sourceBadge, item.source === 'ai' && styles.sourceBadgeAi]}>
                          <Text style={[styles.sourceText, item.source === 'ai' && styles.sourceTextAi]}>
                            {item.source === 'ai'
                              ? '조건 뽑기'
                              : item.source === 'manual'
                                ? '직접 선택'
                                : '랜덤조합'}
                          </Text>
                        </View>
                        <Text style={styles.dateText}>{formatSavedDate(item.createdAt)}</Text>
                      </View>
                      <LibraryStatusActions
                        favorite={item.favorite}
                        onToggleFavorite={() => toggle(() => toggleFavorite(item.id))}
                        onTogglePurchased={() => toggle(() => togglePurchased(item.id))}
                        purchased={item.purchased}
                      />
                    </View>
                    {item.source === 'ai' ? (
                      <>
                        <Pressable
                          accessibilityLabel={conditionsExpanded ? '생성 조건 접기' : '생성 조건 보기'}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: conditionsExpanded }}
                          onPress={() => setExpandedConditionId((current) => current === item.id ? null : item.id)}
                          style={({ pressed }) => [styles.conditionToggle, pressed && styles.pressed]}>
                          <View style={styles.conditionToggleCopy}>
                            <Ionicons color={colors.accentPrimary} name="options-outline" size={15} />
                            <Text style={styles.conditionToggleLabel}>
                              {item.generationConditions
                                ? conditionCount
                                  ? `생성 조건 ${conditionCount}개`
                                  : '생성 조건 없음'
                                : '생성 조건 기록 없음'}
                            </Text>
                          </View>
                          <View style={styles.conditionToggleAction}>
                            <Text style={styles.conditionToggleActionText}>{conditionsExpanded ? '접기' : '보기'}</Text>
                            <Ionicons
                              color={colors.textSecondary}
                              name={conditionsExpanded ? 'chevron-up' : 'chevron-down'}
                              size={14}
                            />
                          </View>
                        </Pressable>
                        {conditionsExpanded ? (
                          <View style={styles.conditionDetails}>
                            {item.generationConditions ? (
                              item.generationConditions.length ? item.generationConditions.map((condition) => (
                                <View key={condition.key} style={styles.conditionRow}>
                                  <Text style={styles.conditionLabel}>{condition.label}</Text>
                                  <Text style={styles.conditionValue}>{condition.value}</Text>
                                </View>
                              )) : (
                                <Text style={styles.conditionEmpty}>선택한 세부 조건 없이 1–45 전체에서 생성했어요.</Text>
                              )
                            ) : (
                              <Text style={styles.conditionEmpty}>조건 기록 기능이 추가되기 전에 저장된 조합이에요.</Text>
                            )}
                            {item.generatorConditions ? (
                              <Pressable
                                accessibilityLabel={productAccess.canRegenerateWithSameConditions
                                  ? '같은 조건으로 다시 뽑기'
                                  : '같은 조건으로 다시 뽑기, Pro 전용'}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: regeneratingId !== null }}
                                disabled={regeneratingId !== null}
                                onPress={() => requestRegenerate(item)}
                                style={({ pressed }) => [
                                  styles.regenerateButton,
                                  pressed && styles.pressed,
                                  regeneratingId !== null && styles.regenerateButtonDisabled,
                                ]}>
                                {regeneratingId === item.id ? (
                                  <ActivityIndicator color={colors.accentPrimary} size="small" />
                                ) : (
                                  <Ionicons color={colors.accentPrimary} name="refresh-outline" size={15} />
                                )}
                                <Text style={styles.regenerateButtonText}>
                                  {regeneratingId === item.id ? '다시 뽑는 중' : '같은 조건으로 다시 뽑기'}
                                </Text>
                                {!productAccess.canRegenerateWithSameConditions ? (
                                  <View style={styles.regenerateProBadge}>
                                    <Text style={styles.regenerateProText}>PRO</Text>
                                  </View>
                                ) : null}
                              </Pressable>
                            ) : null}
                            {regenerationErrorId === item.id ? (
                              <Text accessibilityRole="alert" style={styles.regenerationError}>
                                다시 뽑지 못했어요. 잠시 후 다시 시도해 주세요.
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </>
                    ) : null}
                    <Pressable
                      accessibilityLabel={`${item.numbers.join(', ')} ${productAccess.requiresAdForResults ? '광고 후 분석 결과 보기' : '분석 결과 보기'}`}
                      accessibilityRole="button"
                      onPress={() => analyze(item)}
                      style={({ pressed }) => [
                        styles.numberAction,
                        useStackedAnalysisAction && styles.numberActionStacked,
                        pressed && styles.pressed,
                      ]}>
                      <CombinationNumberRow numbers={item.numbers} size="small" />
                      <View style={[
                        styles.analysisLink,
                        useStackedAnalysisAction && styles.analysisLinkStacked,
                      ]}>
                        <Text style={styles.analysisLinkText}>
                          {productAccess.requiresAdForResults ? '광고 후 결과 보기' : '결과 보기'}
                        </Text>
                        <Ionicons color={colors.accentPrimary} name="chevron-forward" size={15} />
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons color={colors.textSecondary} name={activeTab === 'favorite' ? 'heart-outline' : activeTab === 'purchased' ? 'bag-check-outline' : 'ticket-outline'} size={26} />
              </View>
              <Text style={styles.emptyTitle}>{emptyCopy[0]}</Text>
              <Text style={styles.emptyDescription}>{emptyCopy[1]}</Text>
              {activeTab === 'all' ? (
                <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/draw')} style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>번호 뽑으러 가기</Text>
                </Pressable>
              ) : null}
            </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  guestContent: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.huge, alignItems: 'center', justifyContent: 'center' },
  guestIcon: { width: 58, height: 58, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAccent },
  guestTitle: { marginTop: spacing.lg, color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold, textAlign: 'center' },
  guestDescription: { maxWidth: 320, marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 21, textAlign: 'center' },
  loginButton: { width: '100%', minHeight: 46, marginTop: spacing.xl, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary },
  loginButtonText: { color: '#FFFFFF', fontSize: typography.sizes.body, fontWeight: typography.weights.bold },
  cloudAction: { minHeight: 42, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  cloudActionText: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  storageNotice: { marginHorizontal: spacing.xl, marginTop: spacing.lg, paddingHorizontal: spacing.md, minHeight: 42, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAccent },
  storageNoticeText: { flex: 1, color: colors.textSecondary, fontSize: typography.sizes.caption, lineHeight: 17 },
  storageNoticeAction: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  tabs: { marginHorizontal: spacing.xl, marginTop: spacing.md, padding: 4, flexDirection: 'row', borderRadius: radius.md, backgroundColor: colors.surface },
  tab: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  tabSelected: { backgroundColor: colors.surfaceElevated, boxShadow: colors.cardShadow, elevation: 2 },
  tabText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.medium },
  tabTextSelected: { color: colors.textPrimary, fontWeight: typography.weights.bold },
  scrollContent: { flexGrow: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.huge },
  loading: { color: colors.textSecondary, fontSize: typography.sizes.small, textAlign: 'center', marginTop: spacing.huge },
  list: { gap: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, boxShadow: colors.cardShadow, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sourceBadge: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.round, backgroundColor: colors.surfaceElevated },
  sourceBadgeAi: { backgroundColor: colors.surfaceAccent },
  sourceText: { color: colors.textSecondary, fontSize: 10, fontWeight: typography.weights.bold },
  sourceTextAi: { color: colors.accentPrimary },
  dateText: { color: colors.textTertiary, fontSize: 10 },
  conditionToggle: { minHeight: 38, marginTop: spacing.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.sm, backgroundColor: colors.surfaceElevated },
  conditionToggleCopy: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  conditionToggleLabel: { color: colors.textPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  conditionToggleAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  conditionToggleActionText: { color: colors.textSecondary, fontSize: 10, fontWeight: typography.weights.medium },
  conditionDetails: { marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, borderRadius: radius.sm },
  conditionRow: { minHeight: 28, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs },
  conditionLabel: { flexShrink: 0, color: colors.textSecondary, fontSize: 10 },
  conditionValue: { flex: 1, color: colors.textPrimary, fontSize: 10, fontWeight: typography.weights.semibold, textAlign: 'right' },
  conditionEmpty: { color: colors.textSecondary, fontSize: 10, lineHeight: 16 },
  regenerateButton: { minHeight: 40, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.surfaceAccent },
  regenerateButtonDisabled: { opacity: 0.5 },
  regenerateButtonText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  regenerateProBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.round, backgroundColor: colors.surface },
  regenerateProText: { color: colors.accentPrimary, fontSize: 8, fontWeight: typography.weights.bold, letterSpacing: 0.6 },
  regenerationError: { marginTop: spacing.xs, color: colors.hot, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  numberAction: { marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  numberActionStacked: { alignItems: 'stretch', flexDirection: 'column' },
  analysisLink: { flexShrink: 1, marginLeft: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  analysisLinkStacked: { alignSelf: 'flex-end', marginTop: spacing.sm, marginLeft: 0 },
  analysisLinkText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  emptyState: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.surface },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.sizes.label, fontWeight: typography.weights.bold, marginTop: spacing.lg },
  emptyDescription: { color: colors.textSecondary, fontSize: typography.sizes.small, textAlign: 'center', marginTop: spacing.sm },
  emptyButton: { minHeight: 44, marginTop: spacing.xl, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.accentPrimary },
  emptyButtonText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
  pressed: { opacity: 0.68 },
});
