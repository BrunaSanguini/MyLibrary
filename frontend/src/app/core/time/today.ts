import { InjectionToken } from '@angular/core';

/** A day as the API writes it: `2026-11-08`. */
export type IsoDate = string;

/** The local day of a moment. `toISOString` would give the UTC day, which is tomorrow late at night. */
export function toIsoDate(moment: Date): IsoDate {
  const month = String(moment.getMonth() + 1).padStart(2, '0');
  const day = String(moment.getDate()).padStart(2, '0');
  return `${moment.getFullYear()}-${month}-${day}`;
}

/** Midday of the day, so adding days never trips over a daylight saving change. */
export function parseIsoDate(date: IsoDate): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const moment = parseIsoDate(date);
  moment.setDate(moment.getDate() + days);
  return toIsoDate(moment);
}

/** Whole days from one day to another; negative when the second comes first. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const DAY = 24 * 60 * 60 * 1000;
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / DAY);
}

/** The Monday of the week of a day. */
export function startOfWeek(date: IsoDate): IsoDate {
  const weekday = parseIsoDate(date).getDay();
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

const DAY_MONTH_YEAR = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' });
const DAY_MONTH = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const WEEKDAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const WEEKDAY_LONG = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const NUMERIC = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

/** `8 de novembro de 2026`. */
export function formatLongDate(date: IsoDate): string {
  return DAY_MONTH_YEAR.format(parseIsoDate(date));
}

/** `08/11/2026`. */
export function formatNumericDate(date: IsoDate): string {
  return NUMERIC.format(parseIsoDate(date));
}

/** `8 de nov.` */
export function formatShortDate(date: IsoDate): string {
  return DAY_MONTH.format(parseIsoDate(date));
}

/** `dom`, without the dot some browsers add. */
export function formatWeekday(date: IsoDate): string {
  return WEEKDAY.format(parseIsoDate(date)).replace('.', '');
}

/** `domingo`. */
export function formatLongWeekday(date: IsoDate): string {
  return WEEKDAY_LONG.format(parseIsoDate(date));
}

/**
 * Today, as a function so a page left open overnight asks again. Tests replace it to fix the day.
 */
export const TODAY = new InjectionToken<() => IsoDate>('TODAY', {
  providedIn: 'root',
  factory: () => () => toIsoDate(new Date()),
});

/** The hour now, from 0 to 23, for greetings. Tests replace it like TODAY. */
export const CURRENT_HOUR = new InjectionToken<() => number>('CURRENT_HOUR', {
  providedIn: 'root',
  factory: () => () => new Date().getHours(),
});
