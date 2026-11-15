import { SessionResponse } from '@core/api/reading-api';
import { addDays, daysBetween, IsoDate, startOfWeek } from '@core/time/today';

/** The pages read on one day, with all the sessions of that day added up. */
export interface DayPages {
  readonly date: IsoDate;
  readonly pages: number;
}

/** Every day from `from` to `to`, also the ones without reading, which count as zero. */
export function dailyPages(
  sessions: readonly SessionResponse[],
  from: IsoDate,
  to: IsoDate,
): DayPages[] {
  const byDay = new Map<IsoDate, number>();
  for (const session of sessions) {
    byDay.set(session.date, (byDay.get(session.date) ?? 0) + session.pagesRead);
  }
  const days: DayPages[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    days.push({ date, pages: byDay.get(date) ?? 0 });
  }
  return days;
}

/** Monday to Sunday of the week of a day. */
export function weekOf(sessions: readonly SessionResponse[], today: IsoDate): DayPages[] {
  const monday = startOfWeek(today);
  return dailyPages(sessions, monday, addDays(monday, 6));
}

/** When the reading should end if the pace so far holds. */
export interface Forecast {
  /** Pages per day since the reading started, rounded to one decimal. */
  readonly pagesPerDay: number;
  readonly pagesLeft: number;
  readonly endDate: IsoDate;
}

/**
 * The pace is the pages read divided by the days since the start, today included, so a day
 * without reading slows the forecast down. There is no forecast before the first page, without
 * the size of the book, or once there is nothing left to read.
 */
export function forecastOf(
  pagesRead: number,
  pageCount: number | undefined,
  startDate: IsoDate | undefined,
  today: IsoDate,
): Forecast | undefined {
  if (!pageCount || !startDate || pagesRead <= 0 || pagesRead >= pageCount) {
    return undefined;
  }
  const days = Math.max(1, daysBetween(startDate, today) + 1);
  const pace = pagesRead / days;
  const pagesLeft = pageCount - pagesRead;
  return {
    pagesPerDay: Math.round(pace * 10) / 10,
    pagesLeft,
    endDate: addDays(today, Math.ceil(pagesLeft / pace)),
  };
}
