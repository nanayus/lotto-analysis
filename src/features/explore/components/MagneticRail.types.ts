import type { SharedValue } from 'react-native-reanimated';

export type MagneticRailProps = {
  activeEmphasis: SharedValue<number>;
  continuousValue: SharedValue<number>;
  height: number;
  scrollVelocity: SharedValue<number>;
  width: number;
};
