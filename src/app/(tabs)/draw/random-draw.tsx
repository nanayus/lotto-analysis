import { useLocalSearchParams } from 'expo-router';

import { RandomDrawScreen } from '@/features/random/RandomDrawScreen';

export default function RandomDrawRoute() {
  const { count, draw } = useLocalSearchParams<{
    count?: string | string[];
    draw?: string | string[];
  }>();
  const countValue = Array.isArray(count) ? count.at(-1) : count;
  const requestedCount = Number(countValue);
  const gameCount = requestedCount === 3 || requestedCount === 5 ? requestedCount : 1;
  const autoDrawToken = Array.isArray(draw) ? draw.at(-1) : draw;
  return <RandomDrawScreen autoDrawToken={autoDrawToken} gameCount={gameCount} />;
}
