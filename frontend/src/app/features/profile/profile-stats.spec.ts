import { describe, expect, it } from 'vitest';

import {
  greetingFor,
  heatStart,
  heatWeeks,
  HEAT_WEEKS,
  levelOf,
  monthSummaries,
  monthTitle,
  mostReadGenre,
  paceOf,
  plural,
  romanMonthTitle,
  timeBars,
  weekOf,
} from './profile-stats';

const OVERVIEW = {
  year: 2026,
  month: 11,
  finishedInMonth: 1,
  finishedInYear: 9,
  rereadsInYear: 1,
  pagesInYear: 3240,
  currentStreak: 6,
  longestStreak: 21,
  finishedLast30Days: 1,
  inProgress: 2,
  readingDays: 102,
  notes: 51,
};

describe('profile stats', () => {
  it.each([
    [6, 'Bom dia'],
    [11, 'Bom dia'],
    [12, 'Boa tarde'],
    [17, 'Boa tarde'],
    [18, 'Boa noite'],
    [2, 'Boa noite'],
  ])('greets at %i hours with %s', (hour, greeting) => {
    expect(greetingFor(hour)).toBe(greeting);
  });

  it('writes counts in Portuguese', () => {
    expect(plural(1, 'dia', 'dias')).toBe('1 dia');
    expect(plural(1240, 'página', 'páginas')).toBe('1.240 páginas');
    expect(monthTitle('2026-11-17')).toBe('Novembro de 2026');
  });

  it('draws 26 weeks from Monday to Sunday, ending in the week of today', () => {
    const weeks = heatWeeks('2026-11-17', [
      { date: '2026-11-16', pages: 40 },
      { date: '2026-11-10', pages: 10 },
    ]);

    expect(heatStart('2026-11-17')).toBe('2026-05-25');
    expect(weeks).toHaveLength(HEAT_WEEKS);
    const thisWeek = weeks.at(-1) ?? [];
    expect(thisWeek.map((day) => day.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
    expect(thisWeek[0]).toMatchObject({ pages: 40, level: 3, future: false });
    expect(thisWeek[2]).toMatchObject({ level: 0, future: true });
    expect(weeks.at(-2)?.[1]).toMatchObject({ date: '2026-11-10', level: 1 });
  });

  it('sums the days and pages of each month, oldest first', () => {
    expect(
      monthSummaries([
        { date: '2026-11-02', pages: 10 },
        { date: '2026-10-30', pages: 5 },
        { date: '2026-11-03', pages: 20 },
      ]),
    ).toEqual([
      { month: 'outubro', days: 1, pages: 5 },
      { month: 'novembro', days: 2, pages: 30 },
    ]);
  });

  it('lays the week from Monday with the letters of the design', () => {
    const week = weekOf('2026-11-18', [{ date: '2026-11-16', pages: 12 }]);

    expect(week.map((day) => day.letter).join('')).toBe('STQQSSD');
    expect(week[0]).toMatchObject({ pages: 12, today: false, future: false });
    expect(week[2]).toMatchObject({ today: true });
    expect(week[6]).toMatchObject({ future: true });
  });

  it('writes the rows of Ritmo, with or without a finished book', () => {
    expect(
      paceOf({ ...OVERVIEW, fastestInYear: { bookId: 2, title: 'O Hobbit', days: 6 } }, 'Fantasia'),
    ).toEqual([
      { label: 'Últimos 30 dias', value: '1 livro terminado · 2 em andamento' },
      { label: 'Livro mais rápido', value: 'O Hobbit · 6 dias' },
      { label: 'Maior sequência', value: '21 dias seguidos' },
      { label: 'Páginas viradas', value: '3.240 em 2026' },
      { label: 'Gênero mais lido', value: 'Fantasia' },
    ]);
    expect(paceOf(OVERVIEW)[1]?.value).toBe('Nenhum livro terminado em 2026');
  });

  it.each([
    [0, 0],
    [1, 1],
    [10, 1],
    [11, 2],
    [30, 2],
    [31, 3],
    [60, 3],
    [61, 4],
  ])('puts a day of %i pages on level %i of the heat map', (pages, level) => {
    expect(levelOf(pages)).toBe(level);
  });

  it('finds the genre with more books read, a subgenre counting for its genre', () => {
    const card = (status: string, genres: string[]) =>
      ({ status, genres, authors: [], title: '', id: 1 }) as never;
    const tree = [
      {
        id: 1,
        name: 'Fantasia',
        bookCount: 2,
        subgenres: [{ id: 2, name: 'Alta fantasia', bookCount: 1 }],
      },
      { id: 3, name: 'Romance', bookCount: 2, subgenres: [] },
    ];

    expect(
      mostReadGenre(
        [
          card('READ', ['Fantasia', 'Alta fantasia']),
          card('READ', ['Alta fantasia']),
          card('READ', ['Romance']),
          card('READING', ['Romance']),
        ],
        tree,
      ),
    ).toBe('Fantasia');
    expect(mostReadGenre([card('READING', ['Romance'])], tree)).toBeUndefined();
  });

  it('writes the month by name and the year in roman numerals', () => {
    expect(romanMonthTitle('2026-11-17', () => 'MMXXVI')).toBe('Novembro de MMXXVI');
  });

  it('measures each bar against the book with more days', () => {
    const bars = timeBars([
      { bookId: 1, title: 'A', days: 18, pages: 1 },
      { bookId: 2, title: 'B', days: 9, pages: 1 },
    ]);

    expect(bars.map((bar) => bar.share)).toEqual([100, 50]);
  });
});
