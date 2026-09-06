import type { ComponentProps } from 'react';

import { HorizontalNumberScrubber } from './HorizontalNumberScrubber';
import { NumberScrubberV3 } from './NumberScrubberV3';

type NumberScrubberProps = ComponentProps<typeof NumberScrubberV3> & {
  orientation?: 'horizontal' | 'vertical';
};

export function NumberScrubber({ orientation = 'vertical', ...props }: NumberScrubberProps) {
  return orientation === 'horizontal'
    ? <HorizontalNumberScrubber {...props} />
    : <NumberScrubberV3 {...props} />;
}
