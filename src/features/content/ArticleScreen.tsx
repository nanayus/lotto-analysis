import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getArticleBySlug } from './articles';

import { SubScreenBackButton } from '@/components/ui/SubScreenBackButton';
import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function ArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const article = getArticleBySlug(firstParam(slug));
  const styles = useThemedStyles(createStyles);

  if (!article) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.topBar}><SubScreenBackButton onPress={() => router.back()} /></View>
          <View style={styles.notFound}>
            <Ionicons name="document-text-outline" size={32} style={styles.notFoundIcon} />
            <Text aria-level={1} role="heading" style={styles.notFoundTitle}>게시글을 찾을 수 없어요</Text>
            <Text style={styles.notFoundDescription}>삭제되었거나 주소가 변경된 게시글입니다.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <SubScreenBackButton accessibilityLabel="콘텐츠 목록으로 돌아가기" onPress={() => router.back()} />
          <Text style={styles.topBarTitle}>콘텐츠</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.metaRow}>
            <Text style={styles.category}>{article.category}</Text>
            <Text style={styles.meta}>{article.publishedLabel} · {article.readingMinutes}분</Text>
          </View>
          <Text aria-level={1} role="heading" style={styles.title}>{article.title}</Text>
          <Text style={styles.summary}>{article.summary}</Text>

          <View style={styles.divider} />

          {article.sections.map((section, index) => (
            <View key={`${article.slug}-${index}`} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              <Text aria-level={2} role="heading" style={styles.heading}>{section.heading}</Text>
              {section.paragraphs.map((paragraph) => (
                <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
              ))}
            </View>
          ))}

          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={19} style={styles.disclaimerIcon} />
            <Text style={styles.disclaimerText}>이 글은 과거 데이터에 대한 설명이며 미래 당첨 가능성을 뜻하지 않습니다.</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  container: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: colors.background },
  topBar: { minHeight: 52, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  topBarTitle: { color: colors.textPrimary, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  topBarSpacer: { width: 44 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl, paddingBottom: spacing.huge },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  category: { color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  meta: { color: colors.textTertiary, fontSize: typography.sizes.caption },
  title: { marginTop: spacing.lg, color: colors.textPrimary, fontSize: 32, lineHeight: 41, fontWeight: typography.weights.semibold, letterSpacing: -0.8 },
  summary: { marginTop: spacing.lg, color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 27, letterSpacing: -0.35 },
  divider: { height: 1, marginVertical: spacing.xxxl, backgroundColor: colors.divider },
  section: { marginBottom: spacing.xxxl },
  sectionLabel: { marginBottom: spacing.sm, color: colors.accentPrimary, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: 1.1 },
  heading: { marginBottom: spacing.md, color: colors.textPrimary, fontSize: typography.sizes.section, lineHeight: 29, fontWeight: typography.weights.semibold, letterSpacing: -0.4 },
  paragraph: { marginBottom: spacing.lg, color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 29, letterSpacing: -0.3 },
  disclaimer: { padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface },
  disclaimerIcon: { color: colors.textTertiary },
  disclaimerText: { flex: 1, color: colors.textTertiary, fontSize: typography.sizes.caption, lineHeight: 19 },
  notFound: { flex: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  notFoundIcon: { color: colors.textTertiary },
  notFoundTitle: { marginTop: spacing.lg, color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.semibold },
  notFoundDescription: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.small },
});
