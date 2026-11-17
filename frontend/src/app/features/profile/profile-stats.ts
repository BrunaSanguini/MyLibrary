import { BookTime, DailyPages, StatsOverview } from '@core/api/stats-api';
import { addDays, formatWeekday, IsoDate, parseIsoDate, startOfWeek } from '@core/time/today';

/** Columns of the heat map: half a year of weeks. */
export const HEAT_WEEKS = 26;
/** Levels of the heat map above "no reading". */
export const HEAT_LEVELS = 4;

const NUMBER = new Intl.NumberFormat('pt-BR');
const MONTH_YEAR = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return 'Bom dia';
  }
  return hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
}

/** `1 livro`, `3 livros`: Portuguese plural for a count. */
export function plural(count: number, one: string, many: string): string {
  return `${NUMBER.format(count)} ${count === 1 ? one : many}`;
}

/** `Novembro de 2026`. */
export function monthTitle(date: IsoDate): string {
  const text = MONTH_YEAR.format(parseIsoDate(date));
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
}

/** The first day the heat map shows: the Monday 25 weeks before this week's. */
export function heatStart(today: IsoDate): IsoDate {
  return addDays(startOfWeek(today), -7 * (HEAT_WEEKS - 1));
}

export interface HeatDay {
  readonly date: IsoDate;
  readonly pages: number;
  /** 0 without reading; 1 to 4 by the pages, relative to the busiest day. */
  readonly level: number;
  /** After today: drawn empty. */
  readonly future: boolean;
}

/** Weeks from Monday to Sunday, oldest first, ending in the week of today. */
export function heatWeeks(today: IsoDate, days: readonly DailyPages[]): HeatDay[][] {
  const pagesOf = new Map(days.map((day) => [day.date, day.pages]));
  const busiest = Math.max(0, ...days.map((day) => day.pages));
  const start = heatStart(today);
  return Array.from({ length: HEAT_WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = addDays(start, week * 7 + weekday);
      const pages = pagesOf.get(date) ?? 0;
      const level = pages === 0 ? 0 : Math.max(1, Math.ceil((pages / busiest) * HEAT_LEVELS));
      return { date, pages, level, future: date > today };
    }),
  );
}

export interface MonthSummary {
  readonly month: string;
  readonly days: number;
  readonly pages: number;
}

/** The text that stands for the heat map: days and pages month by month. */
export function monthSummaries(days: readonly DailyPages[]): MonthSummary[] {
  const months = new Map<string, MonthSummary>();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    const current = months.get(key) ?? {
      month: MONTH.format(parseIsoDate(day.date)),
      days: 0,
      pages: 0,
    };
    months.set(key, { ...current, days: current.days + 1, pages: current.pages + day.pages });
  }
  return [...months.entries()]
    .sort(([one], [other]) => one.localeCompare(other))
    .map(([, value]) => value);
}

export interface WeekDay {
  readonly date: IsoDate;
  /** `seg`. */
  readonly name: string;
  /** `S`, as the design writes the days. */
  readonly letter: string;
  readonly pages: number;
  readonly today: boolean;
  readonly future: boolean;
}

/** Monday to Sunday of the week of today. */
export function weekOf(today: IsoDate, days: readonly DailyPages[]): WeekDay[] {
  const pagesOf = new Map(days.map((day) => [day.date, day.pages]));
  const monday = startOfWeek(today);
  return Array.from({ length: 7 }, (_, weekday) => {
    const date = addDays(monday, weekday);
    const name = formatWeekday(date);
    return {
      date,
      name,
      letter: name.charAt(0).toLocaleUpperCase('pt-BR'),
      pages: pagesOf.get(date) ?? 0,
      today: date === today,
      future: date > today,
    };
  });
}

export interface PaceRow {
  readonly label: string;
  readonly value: string;
}

/** The table of Ritmo. */
export function paceOf(overview: StatsOverview): PaceRow[] {
  const fastest = overview.fastestInYear;
  return [
    {
      label: 'Últimos 30 dias',
      value: `${plural(overview.finishedLast30Days, 'livro terminado', 'livros terminados')} · ${NUMBER.format(overview.inProgress)} em andamento`,
    },
    {
      label: 'Livro mais rápido',
      value: fastest
        ? `${fastest.title} · ${plural(fastest.days, 'dia', 'dias')}`
        : `Nenhum livro terminado em ${overview.year}`,
    },
    {
      label: 'Maior sequência',
      value: plural(overview.longestStreak, 'dia seguido', 'dias seguidos'),
    },
    {
      label: 'Páginas viradas',
      value: `${NUMBER.format(overview.pagesInYear)} em ${overview.year}`,
    },
  ];
}

export interface TimeBar extends BookTime {
  /** Width of the bar, against the book with more days. */
  readonly share: number;
}

export function timeBars(books: readonly BookTime[], shown = 5): TimeBar[] {
  const most = books[0]?.days ?? 0;
  return books.slice(0, shown).map((book) => ({
    ...book,
    share: most === 0 ? 0 : Math.round((book.days / most) * 100),
  }));
}

export function formatNumber(value: number): string {
  return NUMBER.format(value);
}
