import { describe, expect, it } from 'vitest';

import { dailyPages, forecastOf, weekOf } from './reading-stats';

const session = (date: string, pagesRead: number, id = 1) => ({ id, date, pagesRead });

describe('dailyPages', () => {
  it('lists every day of the period, with zero on the days without reading', () => {
    const days = dailyPages([session('2026-11-02', 25)], '2026-11-01', '2026-11-03');

    expect(days).toEqual([
      { date: '2026-11-01', pages: 0 },
      { date: '2026-11-02', pages: 25 },
      { date: '2026-11-03', pages: 0 },
    ]);
  });

  it('adds up the sessions of the same day', () => {
    const days = dailyPages(
      [session('2026-11-02', 25, 1), session('2026-11-02', 10, 2)],
      '2026-11-02',
      '2026-11-02',
    );

    expect(days).toEqual([{ date: '2026-11-02', pages: 35 }]);
  });

  it('leaves out the sessions outside the period', () => {
    const days = dailyPages([session('2026-10-31', 99)], '2026-11-01', '2026-11-01');

    expect(days).toEqual([{ date: '2026-11-01', pages: 0 }]);
  });

  it('crosses the end of a month', () => {
    const days = dailyPages([], '2026-11-29', '2026-12-02');

    expect(days.map((day) => day.date)).toEqual([
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
    ]);
  });
});

describe('weekOf', () => {
  it('goes from Monday to Sunday of the week of the day', () => {
    // 8 November 2026 is a Sunday.
    const week = weekOf([session('2026-11-08', 30), session('2026-11-02', 12)], '2026-11-08');

    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ date: '2026-11-02', pages: 12 });
    expect(week[6]).toEqual({ date: '2026-11-08', pages: 30 });
  });

  it('starts on the day itself when it is a Monday', () => {
    expect(weekOf([], '2026-11-09')[0]?.date).toBe('2026-11-09');
  });
});

describe('forecastOf', () => {
  it('projects the end from the pace since the start, today included', () => {
    // 120 pages in 4 days is 30 a day; 456 left take 16 days (15.2 rounded up).
    const forecast = forecastOf(120, 576, '2026-11-05', '2026-11-08');

    expect(forecast).toEqual({ pagesPerDay: 30, pagesLeft: 456, endDate: '2026-11-24' });
  });

  it('counts the first day as a whole day', () => {
    const forecast = forecastOf(100, 300, '2026-11-08', '2026-11-08');

    expect(forecast).toEqual({ pagesPerDay: 100, pagesLeft: 200, endDate: '2026-11-10' });
  });

  it('rounds the pace to one decimal', () => {
    expect(forecastOf(100, 576, '2026-11-06', '2026-11-08')?.pagesPerDay).toBe(33.3);
  });

  it('has no forecast before the first page', () => {
    expect(forecastOf(0, 576, '2026-11-05', '2026-11-08')).toBeUndefined();
  });

  it('has no forecast without the size of the book or the start of the reading', () => {
    expect(forecastOf(120, undefined, '2026-11-05', '2026-11-08')).toBeUndefined();
    expect(forecastOf(120, 576, undefined, '2026-11-08')).toBeUndefined();
  });

  it('has no forecast once there is nothing left to read', () => {
    expect(forecastOf(576, 576, '2026-11-05', '2026-11-08')).toBeUndefined();
  });
});
