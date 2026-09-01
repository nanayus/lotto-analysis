import { useLocalSearchParams } from 'expo-router';

import { RandomDrawScreen } from '@/features/random/RandomDrawScreen';
import { useMonetization } from '@/features/monetization/MonetizationContext';

export default function RandomDrawRoute() {
  const { productAccess } = useMonetization();
  const { count, draw } = useLocalSearchParams<{
    count?: string | string[];
    draw?: string | string[];
  }>();
  const countValue = Array.isArray(count) ? count.at(-1) : count;
  const requestedCount = Number(countValue);
  const requestedGameCount = requestedCount === 2 || requestedCount === 3 || requestedCount === 5 ? requestedCount : 1;
  const gameCount = Math.min(requestedGameCount, productAccess.combinationSelectionLimit) as 1 | 2 | 3 | 5;
  const autoDrawToken = Array.isArray(draw) ? draw.at(-1) : draw;
  return <RandomDrawScreen autoDrawToken={autoDrawToken} gameCount={gameCount} />;
}
