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
import { AppState } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';

import lottoHistoryJson from '@/data/generated/lotto_history.json';
import type { LottoHistoryDraw } from '@/domain/analytics/types';
import { db } from '@/features/auth/firebaseClient';

const CACHE_KEY = 'lotto.remoteDraws.v1';
const REGULAR_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1_000;
const WEEKEND_REFRESH_INTERVAL_MS = 15 * 60 * 1_000;

type CachedLottoData = {
  draws: LottoHistoryDraw[];
  fetchedAt: number;
};

type LottoDataValue = {
  history: LottoHistoryDraw[];
  isReady: boolean;
  latestDraw: LottoHistoryDraw;
  refresh: (force?: boolean) => Promise<void>;
};

const bundledHistory = lottoHistoryJson as LottoHistoryDraw[];
export const BUNDLED_LATEST_ROUND = Math.max(...bundledHistory.map((draw) => draw.round));

function newestDraw(history: readonly LottoHistoryDraw[]) {
  return history.reduce((latest, draw) => draw.round > latest.round ? draw : latest);
}

function validDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isLottoHistoryDraw(value: unknown): value is LottoHistoryDraw {
  if (!value || typeof value !== 'object') return false;
  const draw = value as Partial<LottoHistoryDraw>;
  return Number.isInteger(draw.round)
    && Number(draw.round) > 0
    && validDate(draw.date)
    && Number.isInteger(draw.bonus)
    && Number(draw.bonus) >= 1
    && Number(draw.bonus) <= 45
    && Array.isArray(draw.numbers)
    && draw.numbers.length === 6
    && new Set(draw.numbers).size === 6
    && draw.numbers.every((number) => Number.isInteger(number) && number >= 1 && number <= 45)
    && !draw.numbers.includes(draw.bonus as number);
}

export function mergeLottoHistory(
  bundled: readonly LottoHistoryDraw[],
  remote: readonly LottoHistoryDraw[],
) {
  const byRound = new Map(bundled.map((draw) => [draw.round, draw]));
  remote.filter(isLottoHistoryDraw).forEach((draw) => byRound.set(draw.round, {
    ...draw,
    numbers: [...draw.numbers].sort((left, right) => left - right),
  }));
  return [...byRound.values()].sort((left, right) => right.round - left.round);
}

function seoulParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).formatToParts(now);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function refreshInterval(now: Date) {
  const parts = seoulParts(now);
  const hour = Number(parts.hour);
  const inResultWindow = (parts.weekday === 'Sat' && hour >= 20) || parts.weekday === 'Sun';
  return inResultWindow ? WEEKEND_REFRESH_INTERVAL_MS : REGULAR_REFRESH_INTERVAL_MS;
}

function cachedData(value: string | null): CachedLottoData | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<CachedLottoData>;
    if (!Array.isArray(parsed.draws) || !Number.isFinite(parsed.fetchedAt)) return null;
    return {
      draws: parsed.draws.filter(isLottoHistoryDraw),
      fetchedAt: Number(parsed.fetchedAt),
    };
  } catch {
    return null;
  }
}

const fallbackHistory = mergeLottoHistory(bundledHistory, []);
const fallbackValue: LottoDataValue = {
  history: fallbackHistory,
  isReady: true,
  latestDraw: newestDraw(fallbackHistory),
  refresh: async () => undefined,
};

const LottoDataContext = createContext<LottoDataValue>(fallbackValue);

export function LottoDataProvider({ children }: PropsWithChildren) {
  const [remoteDraws, setRemoteDraws] = useState<LottoHistoryDraw[]>([]);
  const [isReady, setIsReady] = useState(false);
  const fetchedAtRef = useRef(0);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (!db) return;
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    if (!force && Date.now() - fetchedAtRef.current < refreshInterval(new Date())) return;

    const task = getDoc(doc(db, 'publicData', 'lotto'))
      .then(async (snapshot) => {
        const data = snapshot.data();
        const draws = Array.isArray(data?.draws)
          ? data.draws.filter(isLottoHistoryDraw)
          : [];
        if (!draws.length) return;
        const fetchedAt = Date.now();
        fetchedAtRef.current = fetchedAt;
        setRemoteDraws(draws);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ draws, fetchedAt }));
      })
      .catch(() => undefined)
      .finally(() => {
        refreshPromiseRef.current = null;
      });
    refreshPromiseRef.current = task;
    return task;
  }, []);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(CACHE_KEY)
      .then((value) => {
        if (!active) return;
        const cached = cachedData(value);
        if (cached) {
          fetchedAtRef.current = cached.fetchedAt;
          setRemoteDraws(cached.draws);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!active) return;
        setIsReady(true);
        void refresh();
      });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const history = useMemo(
    () => mergeLottoHistory(bundledHistory, remoteDraws),
    [remoteDraws],
  );
  const value = useMemo<LottoDataValue>(() => ({
    history,
    isReady,
    latestDraw: newestDraw(history),
    refresh,
  }), [history, isReady, refresh]);

  return <LottoDataContext.Provider value={value}>{children}</LottoDataContext.Provider>;
}

export function useLottoData() {
  return useContext(LottoDataContext);
}
