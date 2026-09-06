import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppConfirmationDialog } from '@/components/ui/AppConfirmationDialog';
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

import { LibraryConditionSheet } from './components/LibraryConditionSheet';
import { SwipeableLibraryCard } from './components/SwipeableLibraryCard';

type LibraryTab = 'all' | 'favorite';

const TABS: readonly { label: string; value: LibraryTab }[] = [
  { label: '전체', value: 'all' },
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
  const useCompactNumbers = width < 360;
  const { combinations, deleteCombination, isReady, storageMode, toggleFavorite } = useNumberLibrary();
  const { openPaywall, productAccess, proPlanEnabled = true } = useMonetization();
  const { openLogin, state: authState } = useAuth();
  const { setNumbers } = useCombinationDraft();
  const { history: lottoHistory } = useLottoData();
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [conditionSheetItem, setConditionSheetItem] = useState<SavedCombination | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenerationErrorId, setRegenerationErrorId] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<SavedCombination | null>(null);
  const visibleItems = useMemo(() => combinations.filter((item) => (
    activeTab === 'all' || item.favorite
  )), [activeTab, combinations]);

  const analyze = useCallback((item: SavedCombination) => {
    setNumbers(item.numbers, {
      ...(item.generationConditions ? { generationConditions: item.generationConditions } : {}),
      ...(item.generatorConditions ? { generatorConditions: item.generatorConditions } : {}),
      source: item.source,
    });
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

  const confirmDelete = useCallback(() => {
    if (!pendingDeleteItem) return;
    deleteCombination(pendingDeleteItem.id);
    setPendingDeleteItem(null);
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [deleteCombination, pendingDeleteItem]);

  const regenerate = useCallback(async (item: SavedCombination) => {
    if (!item.generatorConditions || regeneratingId) return;
    setRegeneratingId(item.id);
    setRegenerationErrorId(null);
    try {
      const outcome = await generateCombination(item.generatorConditions, { history: lottoHistory });
      setNumbers(outcome.numbers, {
        generationConditions: describeGeneratorConditions(item.generatorConditions),
        generatorConditions: item.generatorConditions,
        source: 'ai',
      });
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.push({
        pathname: COMBINATION_ANALYSIS_ROUTE,
        params: {
          analyze: `library-regenerated-${Date.now()}`,
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
  }, [lottoHistory, regeneratingId, setNumbers]);
  const requestRegenerate = useCallback((item: SavedCombination) => {
    if (!productAccess.canRegenerateWithSameConditions) {
      openPaywall('same-condition-regeneration');
      return;
    }
    void regenerate(item);
  }, [openPaywall, productAccess.canRegenerateWithSameConditions, regenerate]);

  const emptyCopy = activeTab === 'favorite'
    ? ['즐겨찾기한 조합이 없어요', '마음에 드는 조합을 따로 모아볼 수 있어요.']
    : ['아직 저장한 번호가 없어요', '조합 결과에서 즐겨찾기하면 여기에 저장돼요.'];

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
              {visibleItems.map((item) => {
                const conditionCount = item.generationConditions?.length;
                return (
                  <SwipeableLibraryCard
                    favorite={item.favorite}
                    key={item.id}
                    onDeleteRequest={() => setPendingDeleteItem(item)}
                    onToggleFavorite={() => toggle(() => toggleFavorite(item.id))}>
                  <View style={styles.card}>
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
                      {item.source === 'ai' ? (
                        <View style={styles.cardActions}>
                          <Pressable
                            accessibilityLabel="생성 조건 보기"
                            accessibilityRole="button"
                            onPress={() => {
                              setRegenerationErrorId(null);
                              setConditionSheetItem(item);
                            }}
                            style={({ pressed }) => [styles.conditionButton, pressed && styles.pressed]}>
                            <Ionicons color={colors.accentPrimary} name="options-outline" size={17} />
                            {conditionCount !== undefined ? (
                              <View style={styles.conditionCountBadge}>
                                <Text style={styles.conditionCountText}>{conditionCount}</Text>
                              </View>
                            ) : null}
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                    <Pressable
                      accessibilityLabel={`${item.numbers.join(', ')}, 조합 분석하기`}
                      accessibilityRole="button"
                      onPress={() => analyze(item)}
                      style={({ pressed }) => [
                        styles.numberAction,
                        pressed && styles.pressed,
                      ]}>
                      <CombinationNumberRow
                        numbers={item.numbers}
                        size={useCompactNumbers ? 'compact' : 'small'}
                      />
                      <View style={styles.analysisLink}>
                        <Ionicons color={colors.accentPrimary} name="chevron-forward" size={18} />
                      </View>
                    </Pressable>
                  </View>
                  </SwipeableLibraryCard>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons color={colors.textSecondary} name={activeTab === 'favorite' ? 'heart-outline' : 'ticket-outline'} size={26} />
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
        {conditionSheetItem ? (
          <LibraryConditionSheet
            canRegenerate={productAccess.canRegenerateWithSameConditions}
            error={regenerationErrorId === conditionSheetItem.id}
            isRegenerating={regeneratingId === conditionSheetItem.id}
            item={conditionSheetItem}
            onClose={() => setConditionSheetItem(null)}
            onRegenerate={() => requestRegenerate(conditionSheetItem)}
          />
        ) : null}
        <AppConfirmationDialog
          confirmLabel="삭제"
          description={pendingDeleteItem
            ? `${pendingDeleteItem.numbers.join(', ')} 조합이 내번호에서 삭제되며 되돌릴 수 없어요.`
            : undefined}
          destructive
          onCancel={() => setPendingDeleteItem(null)}
          onConfirm={confirmDelete}
          title="삭제하시겠습니까?"
          visible={pendingDeleteItem !== null}
        />
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
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.huge },
  loading: { color: colors.textSecondary, fontSize: typography.sizes.small, textAlign: 'center', marginTop: spacing.huge },
  list: { gap: spacing.md },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface, boxShadow: colors.cardShadow, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sourceBadge: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.round, backgroundColor: colors.surfaceElevated },
  sourceBadgeAi: { backgroundColor: colors.surfaceAccent },
  sourceText: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  sourceTextAi: { color: colors.accentPrimary },
  dateText: { flexShrink: 1, color: colors.textTertiary, fontSize: typography.sizes.caption },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  conditionButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  conditionCountBadge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 2, borderColor: colors.surface, backgroundColor: colors.accentPrimary },
  conditionCountText: { color: '#FFFFFF', fontSize: 9, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
  numberAction: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  analysisLink: { width: 22, height: 32, marginLeft: spacing.xs, alignItems: 'flex-end', justifyContent: 'center' },
  emptyState: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.surface },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.sizes.label, fontWeight: typography.weights.bold, marginTop: spacing.lg },
  emptyDescription: { color: colors.textSecondary, fontSize: typography.sizes.small, textAlign: 'center', marginTop: spacing.sm },
  emptyButton: { minHeight: 44, marginTop: spacing.xl, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.accentPrimary },
  emptyButtonText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
  pressed: { opacity: 0.68 },
});
