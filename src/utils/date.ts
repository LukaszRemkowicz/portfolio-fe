import { useSyncExternalStore } from 'react';

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

export const getDateSlug = (
  dateString: string | null | undefined
): string | null => {
  if (!dateString) return null;
  // `new Date('YYYY-MM-DD')` is already UTC midnight; UTC getters keep the slug
  // identical on server and client regardless of the runtime time zone.
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  // e.g. "jan2026"
  return `${MONTHS[date.getUTCMonth()]}${date.getUTCFullYear()}`;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when `dateString` lies within the last `days` days of `now`. */
export const isWithinDays = (
  dateString: string | null | undefined,
  days: number,
  now: number = Date.now()
): boolean => {
  if (!dateString) return false;
  const time = new Date(dateString).getTime();
  if (isNaN(time)) return false;
  return Math.abs(now - time) < days * DAY_MS;
};

const noopSubscribe = () => () => {};

/**
 * Hydration-safe "recent" flag: false on the server and during hydration, then
 * evaluated against the client clock, so SSR markup can never differ from the
 * first client render (the badge simply appears after mount).
 */
export const useIsRecent = (
  dateString: string | null | undefined,
  days: number
): boolean =>
  useSyncExternalStore(
    noopSubscribe,
    () => isWithinDays(dateString, days),
    () => false
  );
