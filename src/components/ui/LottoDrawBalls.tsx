import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme';

type LottoDrawBallsProps = {
  bonus: number;
  highlightedNumbers: readonly number[];
  numbers: readonly number[];
  size?: 22 | 24;
  style?: StyleProp<ViewStyle>;
};

function formatNumber(number: number) {
  return String(number).padStart(2, '0');
}

export function LottoDrawBalls({
  bonus,
  highlightedNumbers,
  numbers,
  size = 24,
  style,
}: LottoDrawBallsProps) {
  const highlighted = new Set(highlightedNumbers);
  const compact = size === 22;

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
              <Text style={[styles.ballText, active && styles.ballTextActive]}>
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
        <Text style={[styles.ballText, highlighted.has(bonus) && styles.ballTextActive]}>
          {formatNumber(bonus)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderColor: '#35408A',
    backgroundColor: '#171E48',
  },
  ballText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weights.medium,
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
