import { HorizontalMagneticRailFallback } from './HorizontalMagneticRailFallback';
import type { MagneticRailProps } from './MagneticRail.types';

export default function HorizontalMagneticRailWeb(props: MagneticRailProps) {
  return <HorizontalMagneticRailFallback {...props} />;
}
