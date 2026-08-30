import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { AccountSettingsSection } from './AccountSettingsSection';

import {
  type ThemeColors,
  type ThemeMode,
  radius,
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
} from '@/theme';

const FAQ_URL = 'https://wondly.net/#faq-title';
const PRIVACY_URL = 'https://wondly.net/privacy';

const DISPLAY_OPTIONS: readonly { label: string; value: ThemeMode }[] = [
  { label: '밝은 UI', value: 'light' },
  { label: '어두운 UI', value: 'dark' },
  { label: '휴대폰 설정에 따라 바뀜', value: 'system' },
];

function openExternalUrl(url: string) {
  void Linking.openURL(url);
}

export function SettingsScreen() {
  const { mode, setMode } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [displaySheetVisible, setDisplaySheetVisible] = useState(false);
  const activeDisplayLabel = DISPLAY_OPTIONS.find((option) => option.value === mode)?.label;
  const version = Constants.expoConfig?.version ?? '정보 없음';

  const selectDisplayMode = (nextMode: ThemeMode) => {
    setMode(nextMode);
    setDisplaySheetVisible(false);
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>PREFERENCES</Text>
            <Text style={styles.title}>환경설정</Text>
          </View>

          <AccountSettingsSection />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>화면</Text>
            <View style={styles.card}>
              <Pressable
                accessibilityHint="화면 테마 선택 목록을 엽니다"
                accessibilityRole="button"
                onPress={() => setDisplaySheetVisible(true)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                <Text style={styles.rowLabel}>디스플레이</Text>
                <View style={styles.rowTrailing}>
                  <Text style={styles.rowValue}>{activeDisplayLabel}</Text>
                  <Text aria-hidden style={styles.chevron}>›</Text>
                </View>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>정보</Text>
            <View style={styles.card}>
              <Pressable
                accessibilityHint="Wondly 웹사이트에서 자주 묻는 질문을 엽니다"
                accessibilityRole="link"
                onPress={() => openExternalUrl(FAQ_URL)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                <Text style={styles.rowLabel}>FAQ</Text>
                <Text aria-hidden style={styles.externalMark}>↗</Text>
              </Pressable>
              <View style={styles.separator} />
              <Pressable
                accessibilityHint="Wondly 웹사이트에서 개인정보처리방침을 엽니다"
                accessibilityRole="link"
                onPress={() => openExternalUrl(PRIVACY_URL)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                <Text style={styles.rowLabel}>개인정보처리방침</Text>
                <Text aria-hidden style={styles.externalMark}>↗</Text>
              </Pressable>
              <View style={styles.separator} />
              <View accessibilityLabel={`버전 ${version}`} style={styles.row}>
                <Text style={styles.rowLabel}>버전</Text>
                <Text style={styles.rowValue}>{version}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setDisplaySheetVisible(false)}
        transparent
        visible={displaySheetVisible}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="디스플레이 설정 닫기"
            onPress={() => setDisplaySheetVisible(false)}
            style={styles.backdrop}
          />
          <View accessibilityRole="radiogroup" style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>디스플레이</Text>
            <Text style={styles.sheetDescription}>앱에서 사용할 화면 모드를 선택하세요.</Text>
            <View style={styles.optionList}>
              {DISPLAY_OPTIONS.map((option) => {
                const selected = option.value === mode;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={option.value}
                    onPress={() => selectDisplayMode(option.value)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.rowPressed,
                    ]}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  eyebrow: {
    marginBottom: spacing.xs,
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.7,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  card: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: {
    opacity: 0.68,
  },
  rowLabel: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowValue: {
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
  },
  chevron: {
    color: colors.neutral,
    fontSize: 22,
    lineHeight: 24,
  },
  externalMark: {
    color: colors.neutral,
    fontSize: 15,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
    backgroundColor: colors.divider,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.backdropStrong,
  },
  sheet: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    alignSelf: 'center',
    marginBottom: spacing.xl,
    borderRadius: 2,
    backgroundColor: colors.divider,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.bold,
  },
  sheetDescription: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.sizes.body,
  },
  optionList: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  option: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: colors.surfaceAccent,
  },
  optionLabel: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
  optionLabelSelected: {
    color: colors.accentPrimary,
    fontWeight: typography.weights.semibold,
  },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: colors.neutral,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.accentPrimary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentPrimary,
  },
});
