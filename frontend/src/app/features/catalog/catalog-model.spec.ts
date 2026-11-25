import { describe, expect, it } from 'vitest';

import { initialsOf, mascotText, normalize, publisherRows, seriesRows } from './catalog-model';

const roman = (value: number) =>
  ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][value]!;

describe('catalog model', () => {
  it('ignores accents and case in the search', () => {
    expect(normalize(' Gótico ')).toBe('gotico');
  });

  it('takes the initials of the first capitalized word and the last one', () => {
    expect(initialsOf('J.R.R. Tolkien')).toBe('JT');
    expect(initialsOf('Machado de Assis')).toBe('MA');
    expect(initialsOf('Homero')).toBe('H');
  });

  it('counts the readings left for the mascot', () => {
    expect(mascotText(6, roman)).toBe('faltam IV leituras');
    expect(mascotText(9, roman)).toBe('falta I leitura');
    expect(mascotText(12, roman)).toBe('desbloqueado!');
  });

  it('measures a series against all its volumes and tells its status', () => {
    const card = (id: number, status: string, position: number) =>
      ({
        id,
        title: `Livro ${id}`,
        authors: ['Autora'],
        status,
        genres: [],
        ownership: 'OWNED',
        favorite: false,
        reread: false,
        series: { id: 1, name: 'Saga', position },
      }) as never;
    const [row] = seriesRows(
      [{ id: 1, name: 'Saga', totalVolumes: 4, bookCount: 2, coverUrls: [] }],
      [card(2, 'READING', 2), card(1, 'READ', 1)],
    );
    expect(row).toMatchObject({ total: 4, onShelf: 2, read: 1, percent: 25, status: 'reading' });
    expect(row!.covers.map((book) => book.id)).toEqual([1, 2]);
  });

  it('ranks publishers with a bar against the biggest and a share of the shelf', () => {
    const rows = publisherRows(
      [
        { id: 1, name: 'B', bookCount: 1, coverUrls: [] },
        { id: 2, name: 'A', bookCount: 4, coverUrls: [] },
      ],
      8,
    );
    expect(rows).toEqual([
      { id: 2, name: 'A', books: 4, bar: 100, share: 50 },
      { id: 1, name: 'B', books: 1, bar: 25, share: 13 },
    ]);
  });
});
