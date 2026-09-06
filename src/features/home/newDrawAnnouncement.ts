import type { LottoHistoryDraw } from '@/domain/analytics/types';

export const NEW_DRAW_ANNOUNCEMENT_STORAGE_KEY = 'lotto.newDrawAnnouncement.seenRound.v1';

function nextIsoDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function seoulNow(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
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

export function shouldShowNewDrawAnnouncement(
  draw: LottoHistoryDraw,
  seenRound: number,
  now = new Date(),
) {
  if (draw.round <= seenRound || !draw.date) return false;
  const current = seoulNow(now);
  if (current.weekday === 'Sat') {
    return current.date === draw.date
      && (current.hour > 20 || (current.hour === 20 && current.minute >= 35));
  }
  return current.weekday === 'Sun'
    && current.date === nextIsoDate(draw.date);
}
