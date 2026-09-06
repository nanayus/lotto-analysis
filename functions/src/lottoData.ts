import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const OFFICIAL_LOTTO_ENDPOINT =
  'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do';
const BUNDLED_LATEST_ROUND = 1239;
const MAX_CATCH_UP_DRAWS = 12;

type LottoDraw = {
  bonus: number;
  date: string;
  numbers: number[];
  round: number;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function integer(value: unknown): number | null {
  return Number.isInteger(value) ? value as number : null;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export function parseOfficialLottoDraw(payload: unknown): LottoDraw {
  const root = record(payload);
  const data = record(root?.data);
  const list = Array.isArray(data?.list) ? data.list : [];
  const item = record(list[0]);
  if (!item) throw new Error('Official Lotto response did not contain a draw.');

  const round = integer(item.ltEpsd);
  const bonus = integer(item.bnsWnNo);
  const date = isoDate(item.ltRflYmd);
  const numbers = [
    item.tm1WnNo,
    item.tm2WnNo,
    item.tm3WnNo,
    item.tm4WnNo,
    item.tm5WnNo,
    item.tm6WnNo,
  ].map(integer);

  if (
    !round
    || !date
    || bonus === null
    || numbers.some((number) => number === null)
  ) {
    throw new Error('Official Lotto response contained invalid fields.');
  }

  const normalizedNumbers = (numbers as number[]).sort((left, right) => left - right);
  const allNumbers = [...normalizedNumbers, bonus];
  if (
    normalizedNumbers.length !== 6
    || new Set(normalizedNumbers).size !== 6
    || allNumbers.some((number) => number < 1 || number > 45)
    || normalizedNumbers.includes(bonus)
  ) {
    throw new Error('Official Lotto response failed number validation.');
  }

  return { bonus, date, numbers: normalizedNumbers, round };
}

async function fetchOfficialDraw(round?: number) {
  const url = new URL(OFFICIAL_LOTTO_ENDPOINT);
  if (round !== undefined) url.searchParams.set('srchLtEpsd', String(round));
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'LottoInsight/1.0 (+https://lotto.wondly.net)',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Official Lotto request failed: ${response.status}`);
  const draw = parseOfficialLottoDraw(await response.json());
  if (round !== undefined && draw.round !== round) {
    throw new Error(`Official Lotto response returned round ${draw.round}, expected ${round}.`);
  }
  return draw;
}

function storedDraws(value: unknown): LottoDraw[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const candidate = record(item);
    if (!candidate) return [];
    const round = integer(candidate.round);
    const bonus = integer(candidate.bonus);
    const date = typeof candidate.date === 'string' ? candidate.date : null;
    const numbers = Array.isArray(candidate.numbers)
      ? candidate.numbers.map(integer)
      : [];
    if (
      !round
      || bonus === null
      || !date
      || numbers.length !== 6
      || numbers.some((number) => number === null)
    ) return [];
    return [{ bonus, date, numbers: numbers as number[], round }];
  });
}

function seoulDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Seoul',
    year: 'numeric',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function daysSince(date: string) {
  return Math.floor(
    (Date.parse(`${seoulDate()}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`))
      / (24 * 60 * 60 * 1_000),
  );
}

export const syncLatestLottoDraw = onSchedule({
  maxInstances: 1,
  memory: '256MiB',
  maxBackoffSeconds: 600,
  maxDoublings: 0,
  region: 'asia-northeast3',
  retryCount: 6,
  minBackoffSeconds: 300,
  maxRetrySeconds: 3_600,
  schedule: '45 20 * * 6',
  timeZone: 'Asia/Seoul',
  timeoutSeconds: 30,
}, async () => {
  const database = getFirestore();
  const reference = database.doc('publicData/lotto');
  const snapshot = await reference.get();
  const existingDraws = storedDraws(snapshot.data()?.draws);
  const storedLatestRound = existingDraws.reduce(
    (latest, draw) => Math.max(latest, draw.round),
    BUNDLED_LATEST_ROUND,
  );
  const officialLatest = await fetchOfficialDraw();

  if (officialLatest.round <= storedLatestRound) {
    if (daysSince(officialLatest.date) <= 1) {
      console.info('Latest Lotto draw is already synchronized.', {
        latestRound: officialLatest.round,
      });
      return;
    }
    throw new Error(`A draw newer than ${storedLatestRound} is not published yet.`);
  }
  if (officialLatest.round - storedLatestRound > MAX_CATCH_UP_DRAWS) {
    throw new Error('Lotto data gap is too large for automatic catch-up.');
  }

  const fetchedDraws: LottoDraw[] = [];
  for (let round = storedLatestRound + 1; round <= officialLatest.round; round += 1) {
    fetchedDraws.push(round === officialLatest.round
      ? officialLatest
      : await fetchOfficialDraw(round));
  }

  const drawsByRound = new Map(
    [...existingDraws, ...fetchedDraws].map((draw) => [draw.round, draw]),
  );
  const draws = [...drawsByRound.values()].sort((left, right) => left.round - right.round);

  await reference.set({
    baseRound: BUNDLED_LATEST_ROUND,
    draws,
    latestRound: draws.at(-1)?.round ?? BUNDLED_LATEST_ROUND,
    schemaVersion: 1,
    source: OFFICIAL_LOTTO_ENDPOINT,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.info('Lotto draw data synchronized.', {
    fetchedRounds: fetchedDraws.map((draw) => draw.round),
    latestRound: officialLatest.round,
  });
});
