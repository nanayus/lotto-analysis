import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import { normalizeDraftNumbers } from '@/features/combination/CombinationDraftContext';
import { cloneGeneratorConditions } from '@/domain/generator/combinationGenerator';
import {
  type GeneratorConditionDescription,
  restoreGeneratorConditions,
} from '@/domain/generator/describeGeneratorConditions';
import type { GeneratorConditions } from '@/domain/generator/types';
import { useAuth } from '@/features/auth/AuthContext';
import { db } from '@/features/auth/firebaseClient';

export type CombinationSource = 'ai' | 'random';

export type SavedCombination = {
  createdAt: string;
  favorite: boolean;
  generationConditions?: GeneratorConditionDescription[];
  generatorConditions?: GeneratorConditions;
  id: string;
  numbers: number[];
  purchased: boolean;
  source: CombinationSource;
};

type NumberLibraryValue = {
  addCombination: (
    numbers: readonly number[],
    source: CombinationSource,
    options?: {
      generationConditions?: readonly GeneratorConditionDescription[];
      generatorConditions?: GeneratorConditions;
    },
  ) => string | undefined;
  combinations: SavedCombination[];
  isReady: boolean;
  toggleFavorite: (id: string) => void;
  togglePurchased: (id: string) => void;
};

export const NUMBER_LIBRARY_STORAGE_KEY = 'lotto.numberLibrary.v2';
export const NUMBER_LIBRARY_MIGRATION_ID = 'numberLibraryV2';

function userStorageKey(uid: string) {
  return `lotto.numberLibrary.user.${uid}.v1`;
}

const fallbackValue: NumberLibraryValue = {
  addCombination: () => undefined,
  combinations: [],
  isReady: true,
  toggleFavorite: () => undefined,
  togglePurchased: () => undefined,
};

const NumberLibraryContext = createContext<NumberLibraryValue>(fallbackValue);

function isSavedCombination(value: unknown): value is SavedCombination {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SavedCombination>;
  return typeof item.id === 'string'
    && typeof item.createdAt === 'string'
    && typeof item.favorite === 'boolean'
    && typeof item.purchased === 'boolean'
    && (item.source === 'ai' || item.source === 'random')
    && Array.isArray(item.numbers)
    && normalizeDraftNumbers(item.numbers).length === 6;
}

function normalizeGenerationConditions(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const valid = value.every((item) => item
    && typeof item === 'object'
    && typeof (item as Partial<GeneratorConditionDescription>).key === 'string'
    && typeof (item as Partial<GeneratorConditionDescription>).label === 'string'
    && typeof (item as Partial<GeneratorConditionDescription>).value === 'string');
  if (!valid) return undefined;
  return value.map((item) => ({
    key: (item as GeneratorConditionDescription).key,
    label: (item as GeneratorConditionDescription).label,
    value: (item as GeneratorConditionDescription).value,
  }));
}

function normalizeGeneratorConditions(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Partial<GeneratorConditions>;
  const arrayKeys = [
    'acValues',
    'compositeCounts',
    'consecutivePatterns',
    'excludedNumbers',
    'excludedPastRanks',
    'fixedNumbers',
    'highLowCounts',
    'oddCounts',
    'primeCounts',
    'sameEndingPatterns',
    'squareCounts',
  ] as const;
  const bands = item.bandCounts;
  const multiples = item.multipleCounts;
  if (
    !arrayKeys.every((key) => Array.isArray(item[key]))
    || !bands
    || !['1-9', '10-19', '20-29', '30-39', '40-45'].every((key) => Array.isArray(bands[key as keyof typeof bands]))
    || !multiples
    || ![3, 4, 5].every((key) => Array.isArray(multiples[key as keyof typeof multiples]))
    || !item.carry
    || !Array.isArray(item.carry.allowed)
    || !item.neighbor
    || !Array.isArray(item.neighbor.allowed)
    || !item.lastDigitSum
    || !item.standardDeviation
    || !item.sum
  ) return undefined;
  return cloneGeneratorConditions(item as GeneratorConditions);
}

export function normalizeStoredCombinations(values: unknown[]) {
  const seenIds = new Set<string>();
  return values.filter(isSavedCombination).map((item, index) => {
    const id = seenIds.has(item.id) ? `${item.id}-restored-${index}` : item.id;
    seenIds.add(id);
    const {
      generationConditions: storedGenerationConditions,
      generatorConditions: storedGeneratorConditions,
      ...storedItem
    } = item;
    const generationConditions = normalizeGenerationConditions(storedGenerationConditions);
    const generatorConditions = normalizeGeneratorConditions(storedGeneratorConditions)
      ?? (generationConditions ? restoreGeneratorConditions(generationConditions) : undefined);
    return {
      ...storedItem,
      ...(generationConditions ? { generationConditions } : {}),
      ...(generatorConditions ? { generatorConditions } : {}),
      id,
      numbers: normalizeDraftNumbers(item.numbers),
    };
  });
}

function toCloudCombination(item: SavedCombination, ownerUid: string) {
  return {
    createdAt: item.createdAt,
    favorite: item.favorite,
    ...(item.generationConditions ? {
      generationConditions: item.generationConditions.map((condition) => ({ ...condition })),
    } : {}),
    ...(item.generatorConditions ? {
      generatorConditions: cloneGeneratorConditions(item.generatorConditions),
    } : {}),
    id: item.id,
    numbers: [...item.numbers],
    ownerUid,
    purchased: item.purchased,
    source: item.source,
    updatedAt: serverTimestamp(),
  };
}

function cloudDocumentId(id: string) {
  return encodeURIComponent(id);
}

async function migrateGuestLibrary(uid: string, combinations: SavedCombination[]) {
  if (!db) return;
  const database = db;
  const cloudCollection = collection(database, 'users', uid, 'savedCombinations');
  const cloudSnapshot = await getDocs(cloudCollection);
  const existingDocumentIds = new Set(cloudSnapshot.docs.map((item) => item.id));
  const batch = writeBatch(database);
  combinations.forEach((item) => {
    const documentId = cloudDocumentId(item.id);
    if (existingDocumentIds.has(documentId)) return;
    batch.set(
      doc(database, 'users', uid, 'savedCombinations', documentId),
      toCloudCombination(item, uid),
      { merge: true },
    );
  });
  batch.set(doc(database, 'users', uid, 'migrationState', NUMBER_LIBRARY_MIGRATION_ID), {
    completedAt: serverTimestamp(),
    itemCount: combinations.length,
    version: 2,
  }, { merge: true });
  await batch.commit();
}

export function NumberLibraryProvider({ children }: PropsWithChildren) {
  const { state: authState } = useAuth();
  const [combinations, setCombinations] = useState<SavedCombination[]>([]);
  const [isReady, setIsReady] = useState(false);
  const idSequence = useRef(0);
  const combinationsRef = useRef<SavedCombination[]>([]);
  const activeUid = authState.status === 'authenticated' ? authState.user.uid : null;

  useEffect(() => {
    combinationsRef.current = combinations;
  }, [combinations]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setIsReady(false);
    });
    if (authState.status === 'loading') return () => { active = false; };

    const storageKey = activeUid ? userStorageKey(activeUid) : NUMBER_LIBRARY_STORAGE_KEY;
    void AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (!active) return;
        if (!stored) {
          setCombinations([]);
          return;
        }
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          setCombinations(normalizeStoredCombinations(parsed));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => { active = false; };
  }, [activeUid, authState.status]);

  useEffect(() => {
    if (!activeUid || !db || !isReady) return;
    let active = true;
    let unsubscribe: () => void = () => undefined;

    void AsyncStorage.getItem(NUMBER_LIBRARY_STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        const parsed = stored ? JSON.parse(stored) as unknown : [];
        const guestItems = Array.isArray(parsed) ? normalizeStoredCombinations(parsed) : [];
        const itemsById = new Map([...combinationsRef.current, ...guestItems].map((item) => [item.id, item]));
        return migrateGuestLibrary(activeUid, [...itemsById.values()]).then(() => {
          if (stored) return AsyncStorage.removeItem(NUMBER_LIBRARY_STORAGE_KEY);
          return undefined;
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!active || !db) return;
        unsubscribe = onSnapshot(
          collection(db, 'users', activeUid, 'savedCombinations'),
          (snapshot) => {
            const cloudItems = normalizeStoredCombinations(snapshot.docs.map((item) => item.data()));
            setCombinations(cloudItems.sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
            setIsReady(true);
          },
          () => setIsReady(true),
        );
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [activeUid, isReady]);

  useEffect(() => {
    if (!isReady) return;
    const storageKey = activeUid ? userStorageKey(activeUid) : NUMBER_LIBRARY_STORAGE_KEY;
    void AsyncStorage.setItem(storageKey, JSON.stringify(combinations))
      .catch(() => undefined);
  }, [activeUid, combinations, isReady]);

  const syncCombination = useCallback((item: SavedCombination) => {
    if (!activeUid || !db) return;
    void setDoc(
      doc(db, 'users', activeUid, 'savedCombinations', cloudDocumentId(item.id)),
      toCloudCombination(item, activeUid),
      { merge: true },
    ).catch(() => undefined);
  }, [activeUid]);

  const addCombination = useCallback((
    numbers: readonly number[],
    source: CombinationSource,
    options?: {
      generationConditions?: readonly GeneratorConditionDescription[];
      generatorConditions?: GeneratorConditions;
    },
  ) => {
    const normalized = normalizeDraftNumbers(numbers);
    if (normalized.length !== 6) return;
    idSequence.current += 1;
    const createdAt = new Date().toISOString();
    const nextItem: SavedCombination = {
      createdAt,
      favorite: false,
      ...(options?.generationConditions ? {
        generationConditions: options.generationConditions.map((item) => ({ ...item })),
      } : {}),
      ...(options?.generatorConditions ? {
        generatorConditions: cloneGeneratorConditions(options.generatorConditions),
      } : {}),
      id: `${createdAt}-${idSequence.current}-${Math.random().toString(36).slice(2, 9)}`,
      numbers: normalized,
      purchased: false,
      source,
    };
    setCombinations((current) => [nextItem, ...current].slice(0, 200));
    syncCombination(nextItem);
    return nextItem.id;
  }, [syncCombination]);

  const toggleFavorite = useCallback((id: string) => {
    setCombinations((current) => current.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, favorite: !item.favorite };
      syncCombination(updated);
      return updated;
    }));
  }, [syncCombination]);

  const togglePurchased = useCallback((id: string) => {
    setCombinations((current) => current.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, purchased: !item.purchased };
      syncCombination(updated);
      return updated;
    }));
  }, [syncCombination]);

  const value = useMemo(() => ({
    addCombination,
    combinations,
    isReady,
    toggleFavorite,
    togglePurchased,
  }), [addCombination, combinations, isReady, toggleFavorite, togglePurchased]);

  return <NumberLibraryContext.Provider value={value}>{children}</NumberLibraryContext.Provider>;
}

export function useNumberLibrary() {
  return useContext(NumberLibraryContext);
}
