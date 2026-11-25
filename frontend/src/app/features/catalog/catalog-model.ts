import { AuthorResponse, PublisherResponse, SeriesResponse } from '@core/api/catalog-api';
import { GenreTreeResponse } from '@core/api/genres-api';
import { BookCardResponse } from '@core/api/shelf-api';

/** The tabs of Catálogos, by the name they have in the address (`/catalogos/autores`). */
export const CATALOG_TABS = ['generos', 'autores', 'series', 'editoras'] as const;
export type CatalogTab = (typeof CATALOG_TABS)[number];

/** A genre unlocks its mascot after this many books read. */
export const MASCOT_GOAL = 10;

/** Accents and case do not count in the search: "gotico" finds "Gótico". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** In the panel: being read first, then wanted, read and abandoned. */
const STATUS_ORDER: Readonly<Record<BookCardResponse['status'], number>> = {
  READING: 0,
  WANT_TO_READ: 1,
  READ: 2,
  ABANDONED: 3,
};

export interface GenreRow {
  readonly id: number;
  readonly name: string;
  readonly books: readonly BookCardResponse[];
  readonly read: number;
  readonly subgenres: readonly {
    readonly id: number;
    readonly name: string;
    readonly count: number;
  }[];
}

/**
 * Each genre with the books of the shelf in it, its own and those of its subgenres. The books
 * name their genres, so the names make the link; the wishlist stays out.
 */
export function genreRows(
  tree: readonly GenreTreeResponse[],
  cards: readonly BookCardResponse[],
): GenreRow[] {
  return tree.map((genre) => {
    const names = new Set([genre.name, ...genre.subgenres.map((subgenre) => subgenre.name)]);
    const books = cards
      .filter((card) => card.genres.some((name) => names.has(name)))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    return {
      id: genre.id,
      name: genre.name,
      books,
      read: books.filter((card) => card.status === 'READ').length,
      subgenres: genre.subgenres.map((subgenre) => ({
        id: subgenre.id,
        name: subgenre.name,
        count: books.filter((card) => card.genres.includes(subgenre.name)).length,
      })),
    };
  });
}

/** `faltam IV leituras`, `falta I leitura` or `desbloqueado!`. */
export function mascotText(read: number, roman: (value: number) => string): string {
  const left = MASCOT_GOAL - read;
  if (left <= 0) {
    return 'desbloqueado!';
  }
  return left === 1 ? 'falta I leitura' : `faltam ${roman(left)} leituras`;
}

export interface AuthorRow {
  readonly id: number;
  readonly name: string;
  readonly initials: string;
  readonly genres: readonly string[];
  readonly books: number;
  readonly read: number;
}

/**
 * `J.R.R. Tolkien` → JT: the first word that starts with a capital and the last one, with the
 * dots turned into spaces.
 */
export function initialsOf(name: string): string {
  const words = name.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  const first = words.find((word) => /^\p{Lu}/u.test(word)) ?? words[0] ?? '';
  const last = words.at(-1) ?? '';
  return (first === last ? first.charAt(0) : first.charAt(0) + last.charAt(0)).toUpperCase();
}

/** The authors, the one with more books first; a tie goes by name. */
export function authorRows(
  authors: readonly AuthorResponse[],
  cards: readonly BookCardResponse[],
  genreNames: ReadonlySet<string>,
): AuthorRow[] {
  return authors
    .map((author) => {
      const books = cards.filter((card) => card.authors.includes(author.name));
      const genres = [
        ...new Set(books.flatMap((card) => card.genres.filter((name) => genreNames.has(name)))),
      ];
      return {
        id: author.id,
        name: author.name,
        initials: initialsOf(author.name),
        genres: genres.slice(0, 3),
        books: books.length,
        read: books.filter((card) => card.status === 'READ').length,
      };
    })
    .sort(
      (a, b) => b.books - a.books || a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
    );
}

export type SeriesStatus = 'complete' | 'reading' | 'not-started';

export interface SeriesRow {
  readonly id: number;
  readonly name: string;
  readonly author: string;
  readonly total: number;
  readonly onShelf: number;
  readonly read: number;
  readonly percent: number;
  readonly status: SeriesStatus;
  readonly covers: readonly BookCardResponse[];
}

/**
 * Each series with what the shelf has of it: read is out of the whole series (the total of
 * volumes the reader gave, or the books known), not out of the books on the shelf.
 */
export function seriesRows(
  series: readonly SeriesResponse[],
  cards: readonly BookCardResponse[],
): SeriesRow[] {
  return series.map((one) => {
    const books = cards
      .filter((card) => card.series?.id === one.id)
      .sort(
        (a, b) =>
          (a.series?.position ?? Number.MAX_SAFE_INTEGER) -
          (b.series?.position ?? Number.MAX_SAFE_INTEGER),
      );
    const read = books.filter((card) => card.status === 'READ').length;
    const total = Math.max(one.totalVolumes ?? 0, one.bookCount, books.length);
    const reading = books.some((card) => card.status === 'READING');
    return {
      id: one.id,
      name: one.name,
      author: books[0]?.authors.join(', ') ?? '',
      total,
      onShelf: books.length,
      read,
      percent: total > 0 ? Math.round((read / total) * 100) : 0,
      status:
        total > 0 && read >= total ? 'complete' : read > 0 || reading ? 'reading' : 'not-started',
      covers: books.slice(0, 3),
    };
  });
}

export interface PublisherRow {
  readonly id: number;
  readonly name: string;
  readonly books: number;
  /** Width of the bar: books against the biggest publisher. */
  readonly bar: number;
  /** Share of the shelf. */
  readonly share: number;
}

/** The publishers, the one with more books first. */
export function publisherRows(
  publishers: readonly PublisherResponse[],
  totalBooks: number,
): PublisherRow[] {
  const sorted = [...publishers].sort(
    (a, b) =>
      b.bookCount - a.bookCount || a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );
  const most = sorted[0]?.bookCount ?? 0;
  return sorted.map((publisher) => ({
    id: publisher.id,
    name: publisher.name,
    books: publisher.bookCount,
    bar: most > 0 ? Math.round((publisher.bookCount / most) * 100) : 0,
    share: totalBooks > 0 ? Math.round((publisher.bookCount / totalBooks) * 100) : 0,
  }));
}
