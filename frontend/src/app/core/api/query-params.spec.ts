import { describe, expect, it } from 'vitest';

import { toManyOf, toOneOf, toPageIndex, toSearchTerm } from './query-params';

describe('toPageIndex', () => {
  it('returns 0 when the value is not a non-negative integer', () => {
    for (const value of [undefined, '', ' ', 'abc', '-1', '2.5', '1e3', '0x10', ['1', '2']]) {
      expect(toPageIndex(value)).toBe(0);
    }
  });

  it('returns the page when the value is a valid index', () => {
    expect(toPageIndex('0')).toBe(0);
    expect(toPageIndex('3')).toBe(3);
  });
});

describe('toSearchTerm', () => {
  it('returns undefined when there is nothing to search', () => {
    for (const value of [undefined, '', '   ', ['tolkien']]) {
      expect(toSearchTerm(value)).toBeUndefined();
    }
  });

  it('trims the term', () => {
    expect(toSearchTerm('  Machado de Assis ')).toBe('Machado de Assis');
  });

  it('keeps at most 200 characters', () => {
    expect(toSearchTerm('a'.repeat(250))).toHaveLength(200);
  });
});

describe('toOneOf', () => {
  const toStatus = toOneOf(['READING', 'READ'] as const);

  it('accepts only the allowed values', () => {
    expect(toStatus('READ')).toBe('READ');
    expect(toStatus('read')).toBeUndefined();
    expect(toStatus('XYZ')).toBeUndefined();
    expect(toStatus(undefined)).toBeUndefined();
  });
});

describe('toManyOf', () => {
  const toStatuses = toManyOf(['READING', 'READ'] as const);

  it('accepts one value, as the router hands a param that appears once', () => {
    expect(toStatuses('READING')).toEqual(['READING']);
  });

  it('accepts several values, as the router hands a repeated param', () => {
    expect(toStatuses(['READ', 'READING'])).toEqual(['READ', 'READING']);
  });

  it('drops what is not allowed and what repeats', () => {
    expect(toStatuses(['READ', 'EMPRESTADO', 'READ', 7])).toEqual(['READ']);
  });

  it('is empty for an absent param', () => {
    expect(toStatuses(undefined)).toEqual([]);
  });
});
