import { type StyleProp, View, type ViewStyle } from 'react-native';

export function CollapsibleConditionContent({
  children,
  expanded,
  style,
}: {
  children: React.ReactNode;
  expanded: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (!expanded) return null;

  // Keep condition content in the normal React Native layout tree. iOS release
  // builds can leave off-screen animated views at opacity 0 after several
  // conditions are enabled together, preserving the card height but hiding its
  // controls until the screen is remounted.
  return <View style={style}>{children}</View>;
}
