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
const STALE_DATA_RETRY_INTERVAL_MS = 15 * 60 * 1_000;
const DRAW_AVAILABLE_HOUR = 20;
const DRAW_AVAILABLE_MINUTE = 45;

type CachedLottoData = {
  draws: LottoHistoryDraw[];
  fetchedAt: number;
};

export type LottoRefreshResult = {
  latestRound: number;
  status: 'failed' | 'skipped' | 'unavailable' | 'unchanged' | 'updated';
};

type LottoDataValue = {
  history: LottoHistoryDraw[];
  isReady: boolean;
  latestDraw: LottoHistoryDraw;
  refresh: (force?: boolean) => Promise<LottoRefreshResult>;
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
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    year: 'numeric',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: values.weekday,
  };
}

function shiftIsoDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function expectedLatestLottoDrawDate(now = new Date()) {
  const current = seoulParts(now);
  const daysSinceSaturday: Record<string, number> = {
    Sat: 0,
    Sun: 1,
    Mon: 2,
    Tue: 3,
    Wed: 4,
    Thu: 5,
    Fri: 6,
  };
  const elapsedDays = daysSinceSaturday[current.weekday];
  if (elapsedDays === undefined) throw new Error('Unable to determine the Seoul weekday.');

  const beforeSaturdayDraw = elapsedDays === 0
    && (current.hour < DRAW_AVAILABLE_HOUR
      || (current.hour === DRAW_AVAILABLE_HOUR && current.minute < DRAW_AVAILABLE_MINUTE));
  return shiftIsoDate(current.date, beforeSaturdayDraw ? -7 : -elapsedDays);
}

export function shouldRefreshLottoData(
  latestDraw: LottoHistoryDraw,
  fetchedAt: number,
  now = new Date(),
  force = false,
) {
  if (force) return true;
  const expectedDate = expectedLatestLottoDrawDate(now);
  if (latestDraw.date && latestDraw.date >= expectedDate) return false;
  return now.getTime() - fetchedAt >= STALE_DATA_RETRY_INTERVAL_MS;
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
  refresh: async () => ({
    latestRound: newestDraw(fallbackHistory).round,
    status: 'unavailable',
  }),
};

const LottoDataContext = createContext<LottoDataValue>(fallbackValue);

export function LottoDataProvider({ children }: PropsWithChildren) {
  const [remoteDraws, setRemoteDraws] = useState<LottoHistoryDraw[]>([]);
  const [isReady, setIsReady] = useState(false);
  const fetchedAtRef = useRef(0);
  const remoteDrawsRef = useRef<LottoHistoryDraw[]>([]);
  const latestDrawRef = useRef(newestDraw(fallbackHistory));
  const refreshPromiseRef = useRef<Promise<LottoRefreshResult> | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (!db) return {
      latestRound: latestDrawRef.current.round,
      status: 'unavailable' as const,
    };
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const now = new Date();
    if (!shouldRefreshLottoData(latestDrawRef.current, fetchedAtRef.current, now, force)) {
      return {
        latestRound: latestDrawRef.current.round,
        status: 'skipped' as const,
      };
    }

    const previousLatestRound = latestDrawRef.current.round;
    const task: Promise<LottoRefreshResult> = getDoc(doc(db, 'publicData', 'lotto'))
      .then(async (snapshot) => {
        const data = snapshot.data();
        const draws = Array.isArray(data?.draws)
          ? data.draws.filter(isLottoHistoryDraw)
          : [];
        const fetchedAt = Date.now();
        const nextRemoteDraws = draws.length
          ? mergeLottoHistory(remoteDrawsRef.current, draws)
          : remoteDrawsRef.current;
        fetchedAtRef.current = fetchedAt;
        remoteDrawsRef.current = nextRemoteDraws;
        latestDrawRef.current = newestDraw(mergeLottoHistory(bundledHistory, nextRemoteDraws));
        if (draws.length) setRemoteDraws(nextRemoteDraws);
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ draws: nextRemoteDraws, fetchedAt }),
        ).catch(() => undefined);
        return {
          latestRound: latestDrawRef.current.round,
          status: latestDrawRef.current.round > previousLatestRound
            ? 'updated' as const
            : 'unchanged' as const,
        };
      })
      .catch(() => ({
        latestRound: latestDrawRef.current.round,
        status: 'failed' as const,
      }))
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
          remoteDrawsRef.current = cached.draws;
          latestDrawRef.current = newestDraw(mergeLottoHistory(bundledHistory, cached.draws));
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
  useEffect(() => {
    latestDrawRef.current = newestDraw(history);
  }, [history]);
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
