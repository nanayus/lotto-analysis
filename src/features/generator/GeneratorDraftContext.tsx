import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { cloneGeneratorConditions } from '@/domain/generator/combinationGenerator';
import type { GeneratorConditions } from '@/domain/generator/types';

type SavedGeneratorDraft = {
  conditions: GeneratorConditions;
  sessionToken: string;
};

type GeneratorDraftValue = {
  restoreConditions: (sessionToken?: string) => GeneratorConditions | null;
  saveConditions: (sessionToken: string | undefined, conditions: GeneratorConditions) => void;
};

const GeneratorDraftContext = createContext<GeneratorDraftValue | null>(null);

export function GeneratorDraftProvider({ children }: { children: React.ReactNode }) {
  const [savedDraft, setSavedDraft] = useState<SavedGeneratorDraft | null>(null);

  const restoreConditions = useCallback((sessionToken?: string) => {
    if (!sessionToken || savedDraft?.sessionToken !== sessionToken) return null;
    return cloneGeneratorConditions(savedDraft.conditions);
  }, [savedDraft]);

  const saveConditions = useCallback((
    sessionToken: string | undefined,
    conditions: GeneratorConditions,
  ) => {
    if (!sessionToken) return;
    setSavedDraft({
      conditions: cloneGeneratorConditions(conditions),
      sessionToken,
    });
  }, []);

  const value = useMemo(() => ({ restoreConditions, saveConditions }), [restoreConditions, saveConditions]);
  return <GeneratorDraftContext.Provider value={value}>{children}</GeneratorDraftContext.Provider>;
}

export function useGeneratorDraft() {
  const value = useContext(GeneratorDraftContext);
  if (!value) throw new Error('useGeneratorDraft must be used within GeneratorDraftProvider.');
  return value;
}
