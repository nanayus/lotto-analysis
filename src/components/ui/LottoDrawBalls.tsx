import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { type ThemeColors, radius, typography, useThemedStyles } from '@/theme';

type LottoDrawBallsProps = {
  bonus: number;
  highlightedNumbers: readonly number[];
  numbers: readonly number[];
  size?: 22 | 24 | 28;
  style?: StyleProp<ViewStyle>;
};

function formatNumber(number: number) {
  return String(number);
}

export function LottoDrawBalls({
  bonus,
  highlightedNumbers,
  numbers,
  size = 24,
  style,
}: LottoDrawBallsProps) {
  const styles = useThemedStyles(createStyles);
  const highlighted = new Set(highlightedNumbers);
  const compact = size === 22;
  const large = size === 28;

  return (
    <View style={[styles.row, style]}>
      <View style={[styles.mainNumbers, compact && styles.mainNumbersCompact]}>
        {numbers.map((number) => {
          const active = highlighted.has(number);
          return (
            <View
              accessibilityLabel={`${number}번${active ? ', 선택 번호와 일치' : ''}`}
              accessible
              key={number}
              style={[
                styles.ball,
                { height: size, width: size },
                active && styles.ballActive,
              ]}>
              <Text style={[styles.ballText, large && styles.ballTextLarge, active && styles.ballTextActive]}>
                {formatNumber(number)}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.plus, compact && styles.plusCompact]}>+</Text>
      <View
        accessibilityLabel={`보너스 ${bonus}번${highlighted.has(bonus) ? ', 선택 번호와 일치' : ''}`}
        accessible
        style={[
          styles.ball,
          { height: size, width: size },
          highlighted.has(bonus) && styles.ballActive,
        ]}>
        <Text style={[styles.ballText, large && styles.ballTextLarge, highlighted.has(bonus) && styles.ballTextActive]}>
          {formatNumber(bonus)}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainNumbers: {
    flexDirection: 'row',
    gap: 2,
  },
  mainNumbersCompact: {
    gap: 1,
  },
  ball: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: 'transparent',
  },
  ballActive: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfaceAccent,
  },
  ballText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weights.medium,
  },
  ballTextLarge: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
  },
  ballTextActive: {
    color: colors.accentPrimary,
  },
  plus: {
    color: colors.textSecondary,
    fontSize: 12,
    marginHorizontal: 3,
  },
  plusCompact: {
    marginHorizontal: 2,
  },
});
