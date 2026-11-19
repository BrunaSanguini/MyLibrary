import { describe, expect, it } from 'vitest';

import { RomanPipe } from './roman-pipe';
import { toRoman } from './roman';

describe('toRoman', () => {
  it.each([
    [1, 'I'],
    [3, 'III'],
    [4, 'IV'],
    [9, 'IX'],
    [12, 'XII'],
    [26, 'XXVI'],
    [40, 'XL'],
    [90, 'XC'],
    [400, 'CD'],
    [1994, 'MCMXCIV'],
    [2019, 'MMXIX'],
    [2026, 'MMXXVI'],
    [3999, 'MMMCMXCIX'],
  ])('writes %s as %s', (value, expected) => {
    expect(toRoman(value)).toBe(expected);
  });

  it('shows zero as "0", because the Roman numerals have none', () => {
    expect(toRoman(0)).toBe('0');
  });

  it('keeps the Arabic digits above 3999', () => {
    expect(toRoman(4000)).toBe('4000');
    expect(toRoman(12500)).toBe('12500');
  });

  it.each([[-3], [2.5], [Number.NaN]])('keeps %s as it is, since it is not a count', (value) => {
    expect(toRoman(value)).toBe(String(value));
  });
});

describe('RomanPipe', () => {
  it('converts with toRoman', () => {
    expect(new RomanPipe().transform(2026)).toBe('MMXXVI');
    expect(new RomanPipe().transform(0)).toBe('0');
  });
});
