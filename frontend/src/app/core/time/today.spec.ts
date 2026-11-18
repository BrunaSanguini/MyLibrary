import { describe, expect, it } from 'vitest';

import {
  addDays,
  daysBetween,
  formatLongDate,
  formatLongWeekday,
  formatNumericDate,
  formatShortDate,
  formatWeekday,
  startOfWeek,
  toIsoDate,
} from './today';

describe('toIsoDate', () => {
  it('writes the local day, also late at night', () => {
    expect(toIsoDate(new Date(2026, 10, 8, 23, 30))).toBe('2026-11-08');
    expect(toIsoDate(new Date(2026, 0, 5, 0, 10))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('crosses months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('daysBetween', () => {
  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
    expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7);
    expect(daysBetween('2026-11-08', '2026-11-08')).toBe(0);
  });
});

describe('startOfWeek', () => {
  it('is the Monday of the week, also for a Sunday', () => {
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-04')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09');
  });
});

describe('formatting', () => {
  it('writes dates and weekdays in Portuguese', () => {
    expect(formatLongDate('2026-11-08')).toBe('8 de novembro de 2026');
    expect(formatShortDate('2026-11-08')).toMatch(/^8 de nov\.?$/);
    expect(formatNumericDate('2026-11-08')).toBe('08/11/2026');
    expect(formatWeekday('2026-11-08')).toBe('dom');
    expect(formatLongWeekday('2026-11-08')).toBe('domingo');
  });
});
