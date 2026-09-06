import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

type AppConfirmationDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

export function AppConfirmationDialog({
  cancelLabel = '취소',
  confirmLabel = '확인',
  description,
  destructive = false,
  onCancel,
  onConfirm,
  title,
  visible,
}: AppConfirmationDialogProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View accessibilityViewIsModal style={styles.modalRoot}>
        <Pressable
          accessibilityLabel={`${title} 취소`}
          onPress={onCancel}
          style={styles.backdrop}
        />
        <View accessibilityRole="alert" style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                destructive && styles.destructiveButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.backdropStrong,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.section,
    fontWeight: typography.weights.bold,
  },
  description: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surfaceElevated,
  },
  confirmButton: { backgroundColor: colors.accentPrimary },
  destructiveButton: { backgroundColor: colors.hot },
  cancelText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  pressed: { opacity: 0.72 },
});
