import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import { MagneticRailFallback } from './MagneticRailFallback';
import type { MagneticRailProps } from './MagneticRail.types';

export default function MagneticRailWeb(props: MagneticRailProps) {
  return (
    <WithSkiaWeb
      componentProps={props}
      fallback={<MagneticRailFallback {...props} />}
      getComponent={() => import('./MagneticRailSkia')}
      opts={{ locateFile: () => '/canvaskit.wasm' }}
    />
  );
}
