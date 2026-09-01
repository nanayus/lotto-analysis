import { useLocalSearchParams } from 'expo-router';

import { CombinationGeneratorScreen } from '@/features/generator/CombinationGeneratorScreen';
import { useMonetization } from '@/features/monetization/MonetizationContext';

export default function CombinationGeneratorRoute() {
  const { productAccess } = useMonetization();
  const { count, openConditions, sessionToken } = useLocalSearchParams<{
    count?: string | string[];
    openConditions?: string | string[];
    sessionToken?: string | string[];
  }>();
  const value = Array.isArray(count) ? count.at(-1) : count;
  const requestedCount = Number(value);
  const requestedGameCount = requestedCount === 2 || requestedCount === 3 || requestedCount === 5
    ? requestedCount
    : 1;
  const gameCount = Math.min(
    requestedGameCount,
    productAccess.combinationSelectionLimit,
  ) as 1 | 2 | 3 | 5;
  const conditionOpenToken = Array.isArray(openConditions)
    ? openConditions.at(-1)
    : openConditions;
  const restoredSessionToken = Array.isArray(sessionToken)
    ? sessionToken.at(-1)
    : sessionToken;

  return (
    <CombinationGeneratorScreen
      autoOpenConditions
      conditionOnly
      gameCount={gameCount}
      key={conditionOpenToken ?? 'generator'}
      sessionToken={restoredSessionToken ?? conditionOpenToken ?? 'generator'}
    />
  );
}
