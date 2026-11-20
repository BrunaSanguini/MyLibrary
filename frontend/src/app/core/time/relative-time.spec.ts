import { describe, expect, it } from 'vitest';

import { relativeTimeSince } from './relative-time';

const NOW = new Date('2026-11-20T12:00:00Z');

function ago(milliseconds: number): string {
  return new Date(NOW.getTime() - milliseconds).toISOString();
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('relativeTimeSince', () => {
  it.each([
    [0, 'agora'],
    [59 * 1000, 'agora'],
    [MINUTE, 'há 1 minuto'],
    [5 * MINUTE, 'há 5 minutos'],
    [HOUR, 'há 1 hora'],
    [23 * HOUR + 59 * MINUTE, 'há 23 horas'],
    [DAY, 'há 1 dia'],
    [3 * DAY, 'há 3 dias'],
    [6 * DAY + 23 * HOUR, 'há 6 dias'],
    [7 * DAY, 'há 1 semana'],
    [14 * DAY, 'há 2 semanas'],
    [29 * DAY, 'há 4 semanas'],
    [30 * DAY, 'há 1 mês'],
    [64 * DAY, 'há 2 meses'],
    [364 * DAY, 'há 12 meses'],
    [365 * DAY, 'há 1 ano'],
    [800 * DAY, 'há 2 anos'],
  ])('writes %d ms ago as "%s"', (elapsed, expected) => {
    expect(relativeTimeSince(ago(elapsed), NOW)).toBe(expected);
  });

  it('counts a moment in the future as now', () => {
    expect(relativeTimeSince(ago(-2 * MINUTE), NOW)).toBe('agora');
  });

  it('accepts a Date as well as the text the API writes', () => {
    expect(relativeTimeSince(new Date(NOW.getTime() - 2 * DAY), NOW)).toBe('há 2 dias');
  });
});
