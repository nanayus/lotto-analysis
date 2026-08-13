import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';

export function CombinationScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.accentLine} />
        <Text style={styles.title}>어떤 방식으로{`\n`}골라볼까요?</Text>
        <Text style={styles.description}>조합 만들기는{`\n`}다음 단계에서 구현합니다.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 500,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  accentLine: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accentPrimary,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    lineHeight: 38,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.6,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
    lineHeight: 24,
    marginTop: spacing.xxl,
  },
});
