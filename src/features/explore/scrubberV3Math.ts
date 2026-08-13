import { MAX_NUMBER, MIN_NUMBER } from './constants';
import { NUMBER_STEP } from './scrubberV3.constants';
import { clampNumber, snapNumber } from './sliderMath';

export function scrubberOffsetForNumber(number: number): number {
  'worklet';
  return (clampNumber(number) - MIN_NUMBER) * NUMBER_STEP;
}

export function continuousNumberForOffset(offset: number): number {
  'worklet';
  const maximumOffset = (MAX_NUMBER - MIN_NUMBER) * NUMBER_STEP;
  const boundedOffset = Math.max(0, Math.min(maximumOffset, offset));
  return boundedOffset / NUMBER_STEP + MIN_NUMBER;
}

export function nearestScrubberOffset(offset: number): number {
  'worklet';
  return scrubberOffsetForNumber(snapNumber(continuousNumberForOffset(offset)));
}
