import { MAX_NUMBER, MIN_NUMBER, NUMBER_STEP } from './constants';

export function clampNumber(value: number): number {
  'worklet';
  return Math.min(MAX_NUMBER, Math.max(MIN_NUMBER, value));
}

export function snapNumber(value: number): number {
  'worklet';
  return clampNumber(Math.round(value));
}

export function randomLottoNumber(): number {
  return Math.floor(Math.random() * MAX_NUMBER) + MIN_NUMBER;
}

export function numberOffsetFromSelection(number: number, continuousValue: number): number {
  'worklet';
  return (number - continuousValue) * NUMBER_STEP;
}
