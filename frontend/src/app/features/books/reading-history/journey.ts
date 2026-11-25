import { ReadingResponse } from '@core/api/reading-api';
import { daysBetween, IsoDate } from '@core/time/today';

/**
 * The numbers of one reading, as the history shows them: days with the book (both ends count),
 * pages read and pages per day.
 */
export interface Journey {
  readonly days: number | undefined;
  readonly pages: number;
  readonly perDay: number | undefined;
}

/**
 * A finished reading counts the whole book, even when its sessions were not registered; the
 * others count the pages of their sessions. A reading in progress runs until today.
 */
export function journeyOf(
  reading: ReadingResponse,
  pageCount: number | undefined,
  today: IsoDate,
): Journey {
  const { startDate, endDate, status, progress } = reading;
  const end = endDate ?? (status === 'IN_PROGRESS' ? today : undefined);
  const days = startDate && end ? Math.max(1, daysBetween(startDate, end) + 1) : undefined;
  const pages = status === 'FINISHED' ? (pageCount ?? progress.pagesRead) : progress.pagesRead;
  return { days, pages, perDay: days ? Math.round(pages / days) : undefined };
}
