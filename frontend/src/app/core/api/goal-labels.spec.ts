import { describe, expect, it } from 'vitest';

import { goalProgress, goalTitle, MONTHS } from './goal-labels';

describe('goal labels', () => {
  it('names the months in Portuguese, from 1 to 12', () => {
    expect(MONTHS[0]).toEqual({ value: 1, label: 'janeiro' });
    expect(MONTHS[11]).toEqual({ value: 12, label: 'dezembro' });
  });

  it('titles a goal by what it counts and when', () => {
    expect(goalTitle({ type: 'BOOKS', year: 2026 })).toBe('Livros em 2026');
    expect(goalTitle({ type: 'PAGES', year: 2026, month: 11 })).toBe('Páginas em novembro');
  });

  it('writes the progress with the right unit and thousands separator', () => {
    expect(goalProgress({ type: 'PAGES', current: 1250, target: 6000 })).toBe(
      '1.250 de 6.000 páginas',
    );
    expect(goalProgress({ type: 'REREADS', current: 0, target: 1 })).toBe('0 de 1 releitura');
  });
});
