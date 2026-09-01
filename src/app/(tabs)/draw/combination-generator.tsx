import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CombinationGeneratorRoute() {
  const { count, openConditions, sessionToken } = useLocalSearchParams<{
    count?: string | string[];
    openConditions?: string | string[];
    sessionToken?: string | string[];
  }>();
  const conditionOpenToken = Array.isArray(openConditions)
    ? openConditions.at(-1)
    : openConditions;
  const restoredSessionToken = Array.isArray(sessionToken)
    ? sessionToken.at(-1)
    : sessionToken;
  return <Redirect href={{
    pathname: '/combination-generator',
    params: {
      count: Array.isArray(count) ? count.at(-1) : count,
      openConditions: conditionOpenToken,
      sessionToken: restoredSessionToken,
    },
  }} />;
}
