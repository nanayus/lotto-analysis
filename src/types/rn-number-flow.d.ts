declare module 'rn-number-flow' {
  import type { ComponentType } from 'react';
  import type { TextStyle } from 'react-native';
  import type { ReduceMotion } from 'react-native-reanimated';

  type AnimationConfig = {
    enabled?: boolean;
    animateOnMount?: boolean;
    digitDelay?: number;
    mass?: number;
    stiffness?: number;
    damping?: number;
    reduceMotion?: ReduceMotion;
  };

  type NumberFlowProps = {
    value: string;
    style?: TextStyle;
    separatorStyle?: TextStyle;
    animationConfig?: AnimationConfig;
    autoFitText?: boolean;
  };

  const NumberFlow: ComponentType<NumberFlowProps>;
  export default NumberFlow;
}
