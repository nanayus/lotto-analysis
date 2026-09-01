import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPublishedArticles, type LottoArticle } from './articles';

import { MainTabHeader } from '@/components/ui/AppTopBar';
import { useAutoHideTabBar } from '@/navigation/tabBarVisibility';
import { type ThemeColors, radius, spacing, typography, useAppTheme, useThemedStyles } from '@/theme';

function ArticleCard({ article, featured = false }: { article: LottoArticle; featured?: boolean }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityHint="게시글 상세 내용을 엽니다"
      accessibilityLabel={article.title}
      accessibilityRole="button"
      onPress={() => router.push({
        pathname: '/content/[slug]',
        params: { slug: article.slug },
      })}
      style={({ pressed }) => [
        featured ? styles.featureCard : styles.articleCard,
        pressed && styles.pressed,
      ]}>
      {featured ? (
        <View style={styles.featureVisual}>
          <View style={styles.orbitLarge} />
          <View style={styles.orbitSmall} />
          <Text style={styles.featureNumber}>45</Text>
          <Text style={styles.featureMark}>DATA NOTE</Text>
        </View>
      ) : null}
      <View style={featured ? styles.featureCopy : styles.articleCopy}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{article.category}</Text>
          <Text style={styles.meta}>읽는 시간 {article.readingMinutes}분</Text>
        </View>
        <Text aria-level={featured ? 2 : 3} role="heading" style={featured ? styles.featureTitle : styles.articleTitle}>{article.title}</Text>
        <Text style={styles.summary}>{article.summary}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.date}>{article.publishedLabel}</Text>
          <Ionicons color={colors.textSecondary} name="arrow-forward" size={18} />
        </View>
      </View>
    </Pressable>
  );
}

export function ContentHomeScreen() {
  const styles = useThemedStyles(createStyles);
  const tabBarScrollProps = useAutoHideTabBar();
  const articles = getPublishedArticles();
  const featuredArticle = articles.find((article) => article.featured) ?? articles[0];
  const remainingArticles = articles.filter((article) => article.slug !== featuredArticle?.slug);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <MainTabHeader />
        <ScrollView
          {...tabBarScrollProps}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {featuredArticle ? <ArticleCard article={featuredArticle} featured /> : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={28} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>첫 번째 이야기를 준비하고 있어요</Text>
              <Text style={styles.emptyDescription}>새로운 콘텐츠가 등록되면 이곳에서 만날 수 있습니다.</Text>
            </View>
          )}

          {remainingArticles.length > 0 ? (
            <View style={styles.latestSection}>
              <Text aria-level={2} role="heading" style={styles.sectionTitle}>최신 글</Text>
              {remainingArticles.map((article) => <ArticleCard article={article} key={article.slug} />)}
            </View>
          ) : null}

          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} style={styles.noticeIcon} />
            <Text style={styles.noticeText}>콘텐츠는 정보와 재미를 위한 자료이며 당첨을 예측하거나 보장하지 않습니다.</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.huge },
  featureCard: { overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  featureVisual: { height: 178, overflow: 'hidden', justifyContent: 'flex-end', padding: spacing.xxl, backgroundColor: colors.surfaceAccent },
  orbitLarge: { position: 'absolute', width: 230, height: 230, right: -55, top: -88, borderRadius: 115, borderWidth: 1, borderColor: colors.accentPrimary },
  orbitSmall: { position: 'absolute', width: 110, height: 110, right: 18, top: -18, borderRadius: 55, borderWidth: 1, borderColor: colors.accentBorder },
  featureNumber: { position: 'absolute', right: spacing.xxl, bottom: 2, color: colors.accentPrimary, fontSize: 104, lineHeight: 112, fontWeight: typography.weights.semibold, letterSpacing: -7, opacity: 0.22 },
  featureMark: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: 1.5 },
  featureCopy: { padding: spacing.xxl },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  category: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  meta: { color: colors.textTertiary, fontSize: typography.sizes.caption },
  featureTitle: { marginTop: spacing.lg, color: colors.textPrimary, fontSize: 27, lineHeight: 35, fontWeight: typography.weights.semibold, letterSpacing: -0.6 },
  summary: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 22, letterSpacing: -0.2 },
  cardFooter: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: colors.textTertiary, fontSize: typography.sizes.caption },
  latestSection: { marginTop: spacing.xxxl },
  sectionTitle: { marginBottom: spacing.md, color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.semibold },
  articleCard: { marginBottom: spacing.md, flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  articleCopy: { flex: 1, padding: spacing.lg },
  articleTitle: { marginTop: spacing.md, color: colors.textPrimary, fontSize: typography.sizes.body, lineHeight: 24, fontWeight: typography.weights.semibold },
  notice: { marginTop: spacing.xxl, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  noticeIcon: { color: colors.textTertiary },
  noticeText: { flex: 1, color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 18 },
  emptyState: { padding: spacing.xxl, alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  emptyIcon: { color: colors.textTertiary },
  emptyTitle: { marginTop: spacing.md, color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  emptyDescription: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small, lineHeight: 21, textAlign: 'center' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
