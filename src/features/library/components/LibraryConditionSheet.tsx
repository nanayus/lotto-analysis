import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CombinationNumberRow } from '@/components/ui/CombinationNumberRow';
import type { SavedCombination } from '@/features/library/NumberLibraryContext';
import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

type LibraryConditionSheetProps = {
  canRegenerate: boolean;
  error: boolean;
  isRegenerating: boolean;
  item: SavedCombination;
  onClose: () => void;
  onRegenerate: () => void;
};

export function LibraryConditionSheet({
  canRegenerate,
  error,
  isRegenerating,
  item,
  onClose,
  onRegenerate,
}: LibraryConditionSheetProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const conditions = item.generationConditions;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={styles.modalRoot} testID="library-condition-sheet">
        <Pressable accessibilityLabel="생성 조건 닫기" onPress={onClose} style={styles.backdrop} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>생성 조건</Text>
              <Text style={styles.description}>이 조합을 만들 때 적용한 조건이에요.</Text>
            </View>
            <Pressable
              accessibilityLabel="생성 조건 닫기"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Ionicons color={colors.textSecondary} name="close" size={20} />
            </Pressable>
          </View>

          <View style={styles.numberSummary}>
            <CombinationNumberRow numbers={item.numbers} size="compact" />
            <Text style={styles.conditionCount}>
              {conditions ? `${conditions.length}개 조건` : '조건 기록 없음'}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}>
            {conditions ? (
              conditions.length ? conditions.map((condition) => (
                <View key={condition.key} style={styles.conditionRow}>
                  <Text style={styles.conditionLabel}>{condition.label}</Text>
                  <Text style={styles.conditionValue}>{condition.value}</Text>
                </View>
              )) : (
                <Text style={styles.emptyText}>선택한 세부 조건 없이 1–45 전체에서 생성했어요.</Text>
              )
            ) : (
              <Text style={styles.emptyText}>조건 기록 기능이 추가되기 전에 저장된 조합이에요.</Text>
            )}
          </ScrollView>

          {item.generatorConditions ? (
            <SafeAreaView edges={['bottom']} style={styles.footer}>
              <Pressable
                accessibilityLabel={canRegenerate
                  ? '같은 조건으로 다시 뽑기'
                  : '같은 조건으로 다시 뽑기, Pro 전용'}
                accessibilityRole="button"
                accessibilityState={{ disabled: isRegenerating }}
                disabled={isRegenerating}
                onPress={onRegenerate}
                style={({ pressed }) => [
                  styles.regenerateButton,
                  isRegenerating && styles.regenerateButtonDisabled,
                  pressed && styles.pressed,
                ]}>
                {isRegenerating ? (
                  <ActivityIndicator color={colors.accentPrimary} size="small" />
                ) : (
                  <Ionicons color={colors.accentPrimary} name="refresh-outline" size={17} />
                )}
                <Text style={styles.regenerateText}>
                  {isRegenerating ? '다시 뽑는 중' : '같은 조건으로 다시 뽑기'}
                </Text>
                {!canRegenerate ? (
                  <View style={styles.proBadge}>
                    <Text style={styles.proText}>PRO</Text>
                  </View>
                ) : null}
              </Pressable>
              {error ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  다시 뽑지 못했어요. 잠시 후 다시 시도해 주세요.
                </Text>
              ) : null}
            </SafeAreaView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdropStrong },
  sheet: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '82%',
    minHeight: 300,
    alignSelf: 'center',
    paddingTop: spacing.sm,
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
    borderRadius: radius.round,
    backgroundColor: colors.divider,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headingCopy: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  description: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.sizes.caption },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surfaceElevated,
  },
  numberSummary: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  conditionCount: { color: colors.textTertiary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  conditionRow: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  conditionLabel: { flexShrink: 0, color: colors.textSecondary, fontSize: typography.sizes.small },
  conditionValue: { flex: 1, color: colors.textPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, textAlign: 'right' },
  emptyText: { paddingVertical: spacing.xl, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, textAlign: 'center' },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  regenerateButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.round,
    backgroundColor: colors.surfaceAccent,
  },
  regenerateButtonDisabled: { opacity: 0.5 },
  regenerateText: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.bold },
  proBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.round, backgroundColor: colors.surface },
  proText: { color: colors.accentPrimary, fontSize: 10, fontWeight: typography.weights.bold, letterSpacing: 0.4 },
  errorText: { marginTop: spacing.sm, color: colors.hot, fontSize: typography.sizes.caption, lineHeight: 18, textAlign: 'center' },
  pressed: { opacity: 0.68 },
});
