import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

const GAME_COUNTS = [1, 3, 5] as const;

export function DrawHomeScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [gameCount, setGameCount] = useState<(typeof GAME_COUNTS)[number]>(1);

  const openAiDraw = useCallback(() => {
    router.navigate({
      pathname: '/(tabs)/draw/combination-generator',
      params: { count: String(gameCount), openConditions: String(Date.now()) },
    });
  }, [gameCount]);

  const openRandomDraw = useCallback(() => {
    router.navigate({
      pathname: '/(tabs)/draw/random-draw',
      params: { count: String(gameCount), draw: String(Date.now()) },
    });
  }, [gameCount]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>LOTTO DATA EXPLORER</Text>
              <Text style={styles.title}>번호뽑기</Text>
            </View>
            <View style={styles.headerMark}>
              <Ionicons color={colors.accentPrimary} name="sparkles" size={19} />
            </View>
          </View>
          <Text style={styles.tagline}>번호는 무작위. 보는 방식은 다르게.</Text>

          <View style={styles.countSection}>
            <Text style={styles.countLabel}>몇 게임을 뽑을까요?</Text>
            <View accessibilityRole="radiogroup" style={styles.countOptions}>
              {GAME_COUNTS.map((count) => {
                const selected = count === gameCount;
                return (
                  <Pressable
                    accessibilityLabel={`${count}게임`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={count}
                    onPress={() => setGameCount(count)}
                    style={({ pressed }) => [
                      styles.countChip,
                      selected && styles.countChipSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.countChipText, selected && styles.countChipTextSelected]}>
                      {count}게임
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityHint="조건을 선택해 번호를 생성합니다"
            accessibilityRole="button"
            onPress={openAiDraw}
            style={({ pressed }) => [styles.aiCard, pressed && styles.cardPressed]}>
            <View style={styles.aiTopRow}>
              <View style={styles.aiIcon}>
                <Ionicons color={colors.accentPrimary} name="sparkles" size={22} />
              </View>
              <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>MAIN</Text></View>
            </View>
            <View style={styles.aiCopy}>
              <Text style={styles.aiEyebrow}>CONDITION DRAW</Text>
              <Text style={styles.aiTitle}>AI 뽑기</Text>
              <Text style={styles.aiDescription}>원하는 조건을 직접 정하고{`\n`}{gameCount}개의 조합을 만들어보세요.</Text>
            </View>
            <View style={styles.aiAction}>
              <Text style={styles.aiActionText}>조건 선택하고 뽑기</Text>
              <Ionicons color="#FFFFFF" name="arrow-forward" size={18} />
            </View>
          </Pressable>

          <Pressable
            accessibilityHint="조건 없이 번호를 바로 생성합니다"
            accessibilityRole="button"
            onPress={openRandomDraw}
            style={({ pressed }) => [styles.randomCard, pressed && styles.cardPressed]}>
            <View style={styles.randomIcon}>
              <Ionicons color={colors.accentPrimary} name="shuffle" size={22} />
            </View>
            <View style={styles.randomCopy}>
              <Text style={styles.randomTitle}>랜덤조합</Text>
              <Text style={styles.randomDescription}>조건 없이 {gameCount}게임 바로 뽑기</Text>
            </View>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
          </Pressable>

          <Text style={styles.disclaimer}>생성 번호는 당첨 예측이나 추천을 의미하지 않습니다.</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.huge },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: -0.12, marginBottom: spacing.sm },
  title: { color: colors.textPrimary, fontSize: typography.sizes.title, fontWeight: typography.weights.semibold, letterSpacing: -0.37, lineHeight: 44 },
  headerMark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  tagline: { color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 25, letterSpacing: -0.37, marginTop: spacing.sm },
  countSection: { marginTop: spacing.xxxl },
  countLabel: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, letterSpacing: -0.37 },
  countOptions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  countChip: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  countChipSelected: { borderColor: colors.accentPrimary, borderWidth: 2, backgroundColor: colors.surface },
  countChipText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.regular },
  countChipTextSelected: { color: colors.accentPrimary, fontWeight: typography.weights.semibold },
  aiCard: { minHeight: 300, marginTop: spacing.xxl, padding: spacing.xxl, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, boxShadow: 'none', elevation: 0 },
  aiTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  primaryBadge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.round, backgroundColor: colors.surfaceAccent },
  primaryBadgeText: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: -0.12 },
  aiCopy: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  aiEyebrow: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: -0.12 },
  aiTitle: { color: colors.textPrimary, fontSize: 40, lineHeight: 44, fontWeight: typography.weights.semibold, letterSpacing: -0.28, marginTop: spacing.sm },
  aiDescription: { color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 25, letterSpacing: -0.37, marginTop: spacing.md },
  aiAction: { minHeight: 44, alignSelf: 'flex-start', paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.round, backgroundColor: colors.accentPrimary },
  aiActionText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.regular },
  randomCard: { minHeight: 96, marginTop: spacing.lg, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, boxShadow: 'none', elevation: 0 },
  randomIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceAccent },
  randomCopy: { flex: 1, marginLeft: spacing.lg },
  randomTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, letterSpacing: -0.37 },
  randomDescription: { color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, marginTop: spacing.xs },
  disclaimer: { color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 17, textAlign: 'center', marginTop: spacing.xxxl },
  pressed: { opacity: 0.72 },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.95 }] },
});
