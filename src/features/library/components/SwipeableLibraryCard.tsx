import Ionicons from '@expo/vector-icons/Ionicons';
import { type PropsWithChildren, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';

import { type ThemeColors, radius, spacing, typography, useThemedStyles } from '@/theme';

type SwipeableLibraryCardProps = PropsWithChildren<{
  favorite: boolean;
  onDeleteRequest: () => void;
  onToggleFavorite: () => void;
}>;

const ACTION_WIDTH = 76;

export function SwipeableLibraryCard({
  children,
  favorite,
  onDeleteRequest,
  onToggleFavorite,
}: SwipeableLibraryCardProps) {
  const styles = useThemedStyles(createStyles);
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  const applySwipeAction = (direction: SwipeDirection.LEFT | SwipeDirection.RIGHT) => {
    if (direction === SwipeDirection.RIGHT) onToggleFavorite();
    else onDeleteRequest();
    swipeableRef.current?.close();
  };

  const favoriteAction = (
    _progress: SharedValue<number>,
    _translation: SharedValue<number>,
    swipeable: SwipeableMethods,
  ) => (
    <View style={[styles.actionTrack, styles.favoriteTrack]}>
      <Pressable
        accessibilityLabel={favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가'}
        accessibilityRole="button"
        accessibilityState={{ selected: favorite }}
        onPress={() => {
          onToggleFavorite();
          swipeable.close();
        }}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <Ionicons name={favorite ? 'heart-dislike' : 'heart'} size={20} style={styles.favoriteIcon} />
        <Text style={styles.favoriteLabel}>{favorite ? '즐찾 해제' : '즐겨찾기'}</Text>
      </Pressable>
    </View>
  );

  const deleteAction = (
    _progress: SharedValue<number>,
    _translation: SharedValue<number>,
    swipeable: SwipeableMethods,
  ) => (
    <View style={[styles.actionTrack, styles.deleteTrack]}>
      <Pressable
        accessibilityLabel="저장 조합 삭제"
        accessibilityRole="button"
        onPress={() => {
          swipeable.close();
          onDeleteRequest();
        }}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <Ionicons color="#FFFFFF" name="trash-outline" size={20} />
        <Text style={styles.deleteLabel}>삭제</Text>
      </Pressable>
    </View>
  );

  return (
    <ReanimatedSwipeable
      childrenContainerStyle={styles.childrenContainer}
      containerStyle={styles.container}
      enableTrackpadTwoFingerGesture
      friction={1.6}
      leftThreshold={36}
      onSwipeableOpen={applySwipeAction}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={favoriteAction}
      renderRightActions={deleteAction}
      ref={swipeableRef}
      rightThreshold={36}>
      {children}
    </ReanimatedSwipeable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { borderRadius: radius.lg },
  childrenContainer: { backgroundColor: colors.surface },
  actionTrack: { width: ACTION_WIDTH, alignSelf: 'stretch' },
  favoriteTrack: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAccent,
  },
  deleteTrack: {
    alignItems: 'flex-end',
    backgroundColor: colors.hot,
  },
  action: {
    width: ACTION_WIDTH,
    height: '100%',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  favoriteIcon: { color: colors.accentPrimary },
  favoriteLabel: {
    color: colors.accentPrimary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  deleteLabel: {
    color: '#FFFFFF',
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  pressed: { opacity: 0.68 },
});
