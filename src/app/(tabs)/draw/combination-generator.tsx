import { useLocalSearchParams } from 'expo-router';

import { CombinationGeneratorScreen } from '@/features/generator/CombinationGeneratorScreen';

export default function CombinationGeneratorRoute() {
  const { count, openConditions, sessionToken } = useLocalSearchParams<{
    count?: string | string[];
    openConditions?: string | string[];
    sessionToken?: string | string[];
  }>();
  const value = Array.isArray(count) ? count.at(-1) : count;
  const requestedCount = Number(value);
  const gameCount = requestedCount === 3 || requestedCount === 5 ? requestedCount : 1;
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
