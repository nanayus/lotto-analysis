const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns the next regular Lotto 6/45 draw time (Saturday, 20:35 KST). */
export function getNextLottoDrawAt(now: Date) {
  const koreaNow = new Date(now.getTime() + KOREA_OFFSET_MS);
  const daysUntilSaturday = (6 - koreaNow.getUTCDay() + 7) % 7;
  let koreaDrawTime = Date.UTC(
    koreaNow.getUTCFullYear(),
    koreaNow.getUTCMonth(),
    koreaNow.getUTCDate() + daysUntilSaturday,
    20,
    35,
  );

  if (koreaDrawTime <= koreaNow.getTime()) koreaDrawTime += WEEK_MS;
  return new Date(koreaDrawTime - KOREA_OFFSET_MS);
}

export function formatLottoCountdown(now: Date) {
  const { days, hours, minutes, seconds } = getLottoCountdownParts(now);
  return `${days}일 ${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
}

export function getLottoCountdownParts(now: Date) {
  const remainingMs = getNextLottoDrawAt(now).getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));

  return {
    days: Math.floor(totalSeconds / (24 * 60 * 60)),
    hours: Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60)),
    minutes: Math.floor((totalSeconds % (60 * 60)) / 60),
    seconds: totalSeconds % 60,
  };
}

export const padTime = (value: number) => String(value).padStart(2, '0');

export function formatDrawDate(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return `${Number(match[2])}월 ${Number(match[3])}일`;
}
