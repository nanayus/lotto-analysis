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
      params: { count: '1', openConditions: String(Date.now()) },
    });
  }, []);

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
              <Text style={styles.headerMarkText}>✦</Text>
            </View>
          </View>
          <Text style={styles.tagline}>번호는 무작위. 보는 방식은 다르게.</Text>

          <Pressable
            accessibilityLabel="AI 뽑기, 조합 선택하기"
            accessibilityHint="조건을 선택해 번호를 생성합니다"
            accessibilityRole="button"
            onPress={openAiDraw}
            style={({ pressed }) => [styles.aiCard, pressed && styles.cardPressed]}>
            <View style={styles.aiGlowLarge} />
            <View style={styles.aiGlowSmall} />
            <View style={styles.aiTopRow}>
              <View style={styles.aiIcon}>
                <Text style={styles.aiIconText}>✦</Text>
              </View>
              <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>MAIN</Text></View>
            </View>
            <View style={styles.aiCopy}>
              <Text style={styles.aiEyebrow}>CONDITION DRAW</Text>
              <Text style={styles.aiTitle}>AI 뽑기</Text>
              <Text style={styles.aiDescription}>원하는 조건을 직접 정하고{`\n`}하나의 조합을 만들어보세요.</Text>
            </View>
            <View style={styles.aiAction}>
              <Text style={styles.aiActionText}>조합 선택하기</Text>
              <Text style={styles.aiActionArrow}>→</Text>
            </View>
          </Pressable>

          <View style={styles.randomCard}>
            <View style={styles.randomHeader}>
              <View style={styles.randomIcon}>
                <Text style={styles.randomIconText}>⇄</Text>
              </View>
              <View style={styles.randomCopy}>
                <Text style={styles.randomTitle}>랜덤조합</Text>
                <Text style={styles.randomDescription}>조건 없이 번호를 바로 만들어요.</Text>
              </View>
            </View>

            <View style={styles.randomCountSection}>
              <Text style={styles.randomCountLabel}>게임 수</Text>
              <View accessibilityLabel="랜덤조합 게임 수" accessibilityRole="radiogroup" style={styles.countOptions}>
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
              accessibilityHint="조건 없이 번호를 바로 생성합니다"
              accessibilityLabel={`랜덤으로 ${gameCount}게임 뽑기`}
              accessibilityRole="button"
              onPress={openRandomDraw}
              style={({ pressed }) => [styles.randomAction, pressed && styles.randomActionPressed]}>
              <Text style={styles.randomActionText}>{gameCount}게임 바로 뽑기</Text>
              <Text style={styles.randomActionArrow}>→</Text>
            </Pressable>
          </View>

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
  headerMarkText: { color: colors.accentPrimary, fontSize: 22, lineHeight: 24 },
  tagline: { color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 25, letterSpacing: -0.37, marginTop: spacing.sm },
  countOptions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  countChip: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.round, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  countChipSelected: { borderColor: colors.accentPrimary, backgroundColor: colors.surfaceAccent },
  countChipText: { color: colors.textSecondary, fontSize: typography.sizes.small, fontWeight: typography.weights.regular },
  countChipTextSelected: { color: colors.accentPrimary, fontWeight: typography.weights.semibold },
  aiCard: { minHeight: 310, marginTop: spacing.xxxl, padding: spacing.xxl, overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.accentActive, boxShadow: '0 18px 40px rgba(0, 102, 204, 0.20)', elevation: 7 },
  aiGlowLarge: { position: 'absolute', width: 230, height: 230, right: -82, top: -92, borderRadius: 115, backgroundColor: '#FFFFFF12' },
  aiGlowSmall: { position: 'absolute', width: 190, height: 190, left: -118, bottom: -124, borderRadius: 95, backgroundColor: '#00000012' },
  aiTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: '#FFFFFF38', backgroundColor: '#FFFFFF1A' },
  aiIconText: { color: '#FFFFFF', fontSize: 27, lineHeight: 30 },
  primaryBadge: { paddingHorizontal: spacing.lg, paddingVertical: 7, borderRadius: radius.round, backgroundColor: '#FFFFFF1A' },
  primaryBadgeText: { color: '#FFFFFF', fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: 0.8 },
  aiCopy: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  aiEyebrow: { color: '#FFFFFFB8', fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: 1.2 },
  aiTitle: { color: '#FFFFFF', fontSize: 40, lineHeight: 44, fontWeight: typography.weights.semibold, letterSpacing: -0.28, marginTop: spacing.sm },
  aiDescription: { color: '#FFFFFFD9', fontSize: typography.sizes.body, lineHeight: 25, letterSpacing: -0.37, marginTop: spacing.md },
  aiAction: { minHeight: 50, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, borderWidth: 1, borderColor: '#FFFFFF38', backgroundColor: '#FFFFFF18' },
  aiActionText: { color: '#FFFFFF', fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  aiActionArrow: { color: '#FFFFFF', fontSize: 22, lineHeight: 24 },
  randomCard: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, boxShadow: 'none', elevation: 0 },
  randomHeader: { flexDirection: 'row', alignItems: 'center' },
  randomIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceAccent },
  randomIconText: { color: colors.accentPrimary, fontSize: 24, lineHeight: 26 },
  randomCopy: { flex: 1, marginLeft: spacing.lg },
  randomTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, letterSpacing: -0.37 },
  randomDescription: { color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 20, marginTop: spacing.xs },
  randomCountSection: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  randomCountLabel: { color: colors.textSecondary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  randomAction: { minHeight: 48, marginTop: spacing.lg, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, backgroundColor: colors.surfaceAccent },
  randomActionPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  randomActionText: { color: colors.accentPrimary, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold },
  randomActionArrow: { color: colors.accentPrimary, fontSize: 21, lineHeight: 23 },
  disclaimer: { color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 17, textAlign: 'center', marginTop: spacing.xxxl },
  pressed: { opacity: 0.72 },
  cardPressed: { opacity: 0.94, transform: [{ scale: 0.985 }] },
});
