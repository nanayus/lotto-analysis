import { Modal, Pressable, StyleSheet, View } from 'react-native';

import type { CombinationAnalysis } from '@/domain/combination/types';
import { type ThemeColors, radius, spacing, useThemedStyles } from '@/theme';

import { CombinationDetail, type CombinationDetailMode } from './CombinationDetail';

type CombinationDetailSheetProps = {
  analysis: CombinationAnalysis;
  mode: CombinationDetailMode;
  onClose: () => void;
};

export function CombinationDetailSheet({
  analysis,
  mode,
  onClose,
}: CombinationDetailSheetProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible>
      <View style={styles.modalRoot} testID="combination-detail-sheet">
        <Pressable
          accessibilityLabel="기록 닫기"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <CombinationDetail analysis={analysis} mode={mode} onBack={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.backdropStrong,
  },
  sheet: {
    width: '100%',
    maxWidth: 500,
    height: '88%',
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
});
