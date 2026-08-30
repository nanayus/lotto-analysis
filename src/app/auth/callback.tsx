import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography, type ThemeColors, useThemedStyles } from '@/theme';

export default function AuthCallbackScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>로그인 확인 중</Text>
        <Text style={styles.description}>
          앱에서 로그인을 시작했다면 이 페이지를 닫고 Lotto Insight로 돌아가 주세요.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { width: '100%', maxWidth: 500, padding: spacing.xl, alignItems: 'center' },
  title: { color: colors.textPrimary, fontSize: typography.sizes.section, fontWeight: typography.weights.bold },
  description: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.sizes.body, lineHeight: 22, textAlign: 'center' },
});

