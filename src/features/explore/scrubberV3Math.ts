import { MAX_NUMBER, MIN_NUMBER } from './constants';
import { NUMBER_STEP } from './scrubberV3.constants';
import { clampNumber, snapNumber } from './sliderMath';

export function scrubberOffsetForNumber(number: number, step = NUMBER_STEP): number {
  'worklet';
  return (clampNumber(number) - MIN_NUMBER) * step;
}

export function continuousNumberForOffset(offset: number, step = NUMBER_STEP): number {
  'worklet';
  const maximumOffset = (MAX_NUMBER - MIN_NUMBER) * step;
  const boundedOffset = Math.max(0, Math.min(maximumOffset, offset));
  return boundedOffset / step + MIN_NUMBER;
}

export function nearestScrubberOffset(offset: number, step = NUMBER_STEP): number {
  'worklet';
  return scrubberOffsetForNumber(snapNumber(continuousNumberForOffset(offset, step)), step);
}
