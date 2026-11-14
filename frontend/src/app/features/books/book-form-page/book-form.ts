import {
  maxLength,
  min,
  max,
  pattern,
  required,
  SchemaPathTree,
  validate,
} from '@angular/forms/signals';
import { BookDetailResponse, BookRequest } from '@core/api/books-api';
import { NamedEntry } from '@core/api/catalog-api';
import { Ownership } from '@core/api/shelf-api';
import { isValidIsbn10, isValidIsbn13 } from '@shared/validation/isbn';

/**
 * The book as the form edits it. Signal Forms wants a model with no undefined, so empty text is
 * '' and an empty number is null; publisher and series are flattened into id and name.
 */
export interface BookFormModel {
  title: string;
  subtitle: string;
  isbn13: string;
  isbn10: string;
  pageCount: number | null;
  publishedYear: number | null;
  languageCode: string;
  synopsis: string;
  authors: NamedEntry[];
  publisherId: number | null;
  publisherName: string;
  genres: NamedEntry[];
  seriesId: number | null;
  seriesName: string;
  seriesPosition: number | null;
  ownership: Ownership;
  favorite: boolean;
}

export function emptyBookForm(): BookFormModel {
  return {
    title: '',
    subtitle: '',
    isbn13: '',
    isbn10: '',
    pageCount: null,
    publishedYear: null,
    languageCode: '',
    synopsis: '',
    authors: [],
    publisherId: null,
    publisherName: '',
    genres: [],
    seriesId: null,
    seriesName: '',
    seriesPosition: null,
    ownership: 'NONE',
    favorite: false,
  };
}

export function bookFormOf(book: BookDetailResponse): BookFormModel {
  return {
    title: book.title,
    subtitle: book.subtitle ?? '',
    isbn13: book.isbn13 ?? '',
    isbn10: book.isbn10 ?? '',
    pageCount: book.pageCount ?? null,
    publishedYear: book.publishedYear ?? null,
    languageCode: book.languageCode ?? '',
    synopsis: book.synopsis ?? '',
    authors: book.authors.map(({ id, name }) => ({ id, name })),
    publisherId: book.publisher?.id ?? null,
    publisherName: book.publisher?.name ?? '',
    genres: book.genres.map(({ id, name }) => ({ id, name })),
    seriesId: book.series?.id ?? null,
    seriesName: book.series?.name ?? '',
    seriesPosition: book.series?.position ?? null,
    ownership: book.ownership,
    favorite: book.favorite,
  };
}

/** Empty text goes as absent, the way the API expects optional fields. */
export function bookRequestOf(model: BookFormModel): BookRequest {
  const text = (value: string) => value.trim() || undefined;
  return {
    title: model.title.trim(),
    subtitle: text(model.subtitle),
    isbn13: text(model.isbn13),
    isbn10: text(model.isbn10),
    pageCount: model.pageCount ?? undefined,
    publishedYear: model.publishedYear ?? undefined,
    languageCode: text(model.languageCode),
    synopsis: text(model.synopsis),
    authorIds: model.authors.map((author) => author.id),
    publisherId: model.publisherId ?? undefined,
    genreIds: model.genres.map((genre) => genre.id),
    seriesId: model.seriesId ?? undefined,
    seriesPosition: model.seriesPosition ?? undefined,
    ownership: model.ownership,
    favorite: model.favorite,
  };
}

/**
 * Validation mirroring BookRequest and Book on the back-end, so the form refuses what the API
 * would refuse, with the message next to the field instead of after a round trip.
 */
export function bookFormSchema(book: SchemaPathTree<BookFormModel>): void {
  required(book.title, { message: 'Informe o título.' });
  maxLength(book.title, 500, { message: 'O título tem no máximo 500 caracteres.' });
  maxLength(book.subtitle, 500, { message: 'O subtítulo tem no máximo 500 caracteres.' });
  validate(book.isbn13, ({ value }) =>
    value().trim() === '' || isValidIsbn13(value())
      ? undefined
      : { kind: 'isbn13', message: 'ISBN-13 inválido: confira os 13 dígitos.' },
  );
  validate(book.isbn10, ({ value }) =>
    value().trim() === '' || isValidIsbn10(value())
      ? undefined
      : { kind: 'isbn10', message: 'ISBN-10 inválido: confira os 10 caracteres.' },
  );
  min(book.pageCount, 1, { message: 'O número de páginas começa em 1.' });
  min(book.publishedYear, 1, { message: 'Informe um ano entre 1 e 2999.' });
  max(book.publishedYear, 2999, { message: 'Informe um ano entre 1 e 2999.' });
  pattern(book.languageCode, /^[a-z]{3}$/, {
    message: 'Use o código de idioma com três letras minúsculas, como por ou eng.',
  });
  maxLength(book.synopsis, 10_000, { message: 'A sinopse tem no máximo 10.000 caracteres.' });
  validate(book.authors, ({ value }) =>
    value().length > 0 ? undefined : { kind: 'authors', message: 'Informe ao menos um autor.' },
  );
  // Series and position travel together, as book.series-position-required says on the back-end.
  validate(book.seriesPosition, ({ value, valueOf }) => {
    const hasSeries = valueOf(book.seriesId) !== null;
    const position = value();
    if (hasSeries && position === null) {
      return { kind: 'seriesPosition', message: 'Informe a posição do livro na série.' };
    }
    if (!hasSeries && position !== null) {
      return { kind: 'seriesPosition', message: 'Escolha a série antes de informar a posição.' };
    }
    if (position !== null && position <= 0) {
      return { kind: 'seriesPosition', message: 'A posição na série começa em 0,1.' };
    }
    return undefined;
  });
}

/** Field of the form a server-side field error belongs to, by the name the API uses. */
export const SERVER_FIELDS: Readonly<Record<string, keyof BookFormModel>> = {
  title: 'title',
  subtitle: 'subtitle',
  isbn13: 'isbn13',
  isbn10: 'isbn10',
  pageCount: 'pageCount',
  publishedYear: 'publishedYear',
  languageCode: 'languageCode',
  synopsis: 'synopsis',
  authorIds: 'authors',
  genreIds: 'genres',
  seriesPosition: 'seriesPosition',
};
