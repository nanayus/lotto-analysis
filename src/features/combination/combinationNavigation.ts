export const COMBINATION_ANALYSIS_ROUTE = '/combination-analysis' as const;

export type CombinationReturnTarget =
  | 'combination-generator'
  | 'draw'
  | 'explore'
  | 'my-numbers'
  | 'random-draw'
  | 'statistics';

export function buildCombinationReturnDestination({
  gameCount,
  sessionToken,
  target,
  token,
}: {
  gameCount?: string;
  sessionToken?: string;
  target?: string;
  token?: string;
}) {
  if (target === 'draw') return '/(tabs)/draw' as const;
  if (target === 'combination-generator') {
    const conditionToken = token || String(Date.now());
    return {
      pathname: '/(tabs)/draw/combination-generator' as const,
      params: {
        count: gameCount === '3' || gameCount === '5' ? gameCount : '1',
        openConditions: conditionToken,
        sessionToken: sessionToken || conditionToken,
      },
    };
  }
  if (target === 'my-numbers') return '/(tabs)/my-numbers' as const;
  if (target === 'explore') return '/statistics/explore' as const;
  if (target === 'random-draw') {
    return {
      pathname: '/(tabs)/draw/random-draw' as const,
      params: {
        count: gameCount === '3' || gameCount === '5' ? gameCount : '1',
        draw: token || String(Date.now()),
      },
    };
  }
  return '/(tabs)/statistics' as const;
}
