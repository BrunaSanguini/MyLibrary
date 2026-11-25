import { disabled, required, SchemaPathTree, validate } from '@angular/forms/signals';
import { BookDetailResponse, BookRequest } from '@core/api/books-api';
import { NamedEntry } from '@core/api/catalog-api';
import { ImportPreviewResponse } from '@core/api/import-api';
import { BookReadingStatus, ReadingRequest } from '@core/api/reading-api';
import { Ownership } from '@core/api/shelf-api';
import { compactIsbn, isValidIsbn10, isValidIsbn13 } from '@shared/validation/isbn';

/** A genre of the book; a subgenre points to its genre. */
export interface GenreEntry {
  readonly id: number;
  readonly name: string;
  readonly parentId: number | null;
}

/**
 * The book as the form edits it. Signal Forms wants a model with no undefined, so empty text is
 * '' and an empty number is null; the series is flattened into id and name.
 *
 * <p>The form shows one ISBN field; the book keeps the ISBN-13 and the ISBN-10 apart. Subtitle,
 * language and synopsis are not on the form (the spec leaves them out) but travel with it, so
 * editing a book never loses them, and the Open Library fills them.
 */
export interface BookFormModel {
  title: string;
  subtitle: string;
  isbn: string;
  isbn13: string;
  isbn10: string;
  pageCount: number | null;
  publishedYear: number | null;
  languageCode: string;
  synopsis: string;
  authors: NamedEntry[];
  /** The form picks one; a co-edition saved before keeps the others. */
  publishers: NamedEntry[];
  /** Genres and subgenres together, as the API takes them; the form shows them apart. */
  genres: GenreEntry[];
  seriesId: number | null;
  seriesName: string;
  seriesPosition: number | null;
  /** Tenho este livro or Ainda não tenho; NONE only on books saved before that choice. */
  ownership: Ownership;
  favorite: boolean;
  /** Where the reading stands; only for a new book that the reader has. */
  status: BookReadingStatus;
  startDate: string;
  endDate: string;
  /** The page an abandoned book stopped at. */
  stoppedAt: number | null;
}

export function emptyBookForm(): BookFormModel {
  return {
    title: '',
    subtitle: '',
    isbn: '',
    isbn13: '',
    isbn10: '',
    pageCount: null,
    publishedYear: null,
    languageCode: '',
    synopsis: '',
    authors: [],
    publishers: [],
    genres: [],
    seriesId: null,
    seriesName: '',
    seriesPosition: null,
    ownership: 'OWNED',
    favorite: false,
    status: 'WANT_TO_READ',
    startDate: '',
    endDate: '',
    stoppedAt: null,
  };
}

export function bookFormOf(book: BookDetailResponse): BookFormModel {
  return {
    ...emptyBookForm(),
    title: book.title,
    subtitle: book.subtitle ?? '',
    isbn: book.isbn13 ?? book.isbn10 ?? '',
    isbn13: book.isbn13 ?? '',
    isbn10: book.isbn10 ?? '',
    pageCount: book.pageCount ?? null,
    publishedYear: book.publishedYear ?? null,
    languageCode: book.languageCode ?? '',
    synopsis: book.synopsis ?? '',
    authors: book.authors.map(({ id, name }) => ({ id, name })),
    publishers: book.publishers.map(({ id, name }) => ({ id, name })),
    genres: book.genres.map(({ id, name, parentId }) => ({ id, name, parentId: parentId ?? null })),
    seriesId: book.series?.id ?? null,
    seriesName: book.series?.name ?? '',
    seriesPosition: book.series?.position ?? null,
    ownership: book.ownership,
    favorite: book.favorite,
  };
}

/**
 * What the Open Library brought, over what the form had. Gênero, subgênero and série are never
 * touched: the Open Library does not know them. Authors and publisher come as entries already
 * found or created by name.
 */
export function withEdition(
  model: BookFormModel,
  edition: ImportPreviewResponse,
  authors: NamedEntry[],
  publisher: NamedEntry | undefined,
): BookFormModel {
  return {
    ...model,
    title: edition.title,
    subtitle: edition.subtitle ?? '',
    isbn: edition.isbn13 ?? edition.isbn10 ?? '',
    isbn13: edition.isbn13 ?? '',
    isbn10: edition.isbn10 ?? '',
    pageCount: edition.pageCount ?? null,
    publishedYear: edition.publishedYear ?? null,
    languageCode: edition.languageCode ?? '',
    synopsis: edition.synopsis ?? '',
    authors,
    publishers: publisher ? [publisher] : [],
  };
}

/** Empty text goes as absent, the way the API expects optional fields. */
export function bookRequestOf(model: BookFormModel): BookRequest {
  const text = (value: string) => value.trim() || undefined;
  return {
    title: model.title.trim(),
    subtitle: text(model.subtitle),
    ...isbnsOf(model),
    pageCount: model.pageCount ?? undefined,
    publishedYear: model.publishedYear ?? undefined,
    languageCode: text(model.languageCode),
    synopsis: text(model.synopsis),
    authorIds: model.authors.map((author) => author.id),
    publisherIds: model.publishers.map((publisher) => publisher.id),
    genreIds: model.genres.map((genre) => genre.id),
    seriesId: model.seriesId ?? undefined,
    seriesPosition: model.seriesPosition ?? undefined,
    ownership: model.ownership,
    favorite: model.favorite,
  };
}

/**
 * The one ISBN of the form goes where its length says. The other kind is kept when the book had
 * it, so editing a book with both never loses one; clearing the field clears both.
 */
function isbnsOf(model: BookFormModel): Pick<BookRequest, 'isbn13' | 'isbn10'> {
  const isbn = compactIsbn(model.isbn);
  if (isbn === '') {
    return {};
  }
  if (isbn.length === 13) {
    return { isbn13: isbn, isbn10: model.isbn10 || undefined };
  }
  return { isbn10: isbn, isbn13: model.isbn13 || undefined };
}

/**
 * The reading the form registers with a new book: none for "Quero ler". Without the dates the
 * reader did not give, the API takes today, the same as the page of Registrar leitura.
 */
export function readingOf(model: BookFormModel, today: string): ReadingRequest | undefined {
  const start = model.startDate || undefined;
  switch (model.status) {
    case 'READING':
      return { status: 'IN_PROGRESS', startDate: start ?? today };
    case 'READ':
      return { status: 'FINISHED', startDate: start, endDate: model.endDate || today };
    case 'ABANDONED':
      return { status: 'ABANDONED', startDate: start, endDate: today };
    default:
      return undefined;
  }
}

const WHOLE = 'Número inteiro de 1 a 9999.';

/**
 * Validation mirroring BookRequest on the back-end, so the form refuses what the API would refuse,
 * with the message next to the field instead of after a round trip. Only title and authors are
 * required; `today` is the limit of the dates, which can never be in the future.
 */
export function bookFormSchema(today: () => string) {
  return (book: SchemaPathTree<BookFormModel>): void => {
    required(book.title, { message: 'Informe o título do livro.' });
    validate(book.title, ({ value }) =>
      value().length > 500
        ? { kind: 'maxLength', message: 'O título tem no máximo 500 caracteres.' }
        : undefined,
    );
    validate(book.authors, ({ value }) =>
      value().length > 0
        ? undefined
        : {
            kind: 'authors',
            message: 'Escolha ao menos um autor — ou cadastre um novo na própria lista.',
          },
    );
    for (const field of [book.pageCount, book.publishedYear, book.stoppedAt]) {
      validate(field, ({ value }) => {
        const number = value();
        return number === null || (Number.isInteger(number) && number >= 1 && number <= 9999)
          ? undefined
          : { kind: 'whole', message: WHOLE };
      });
    }
    validate(book.isbn, ({ value }) => {
      const isbn = value().trim();
      return isbn === '' || isValidIsbn13(isbn) || isValidIsbn10(isbn)
        ? undefined
        : { kind: 'isbn', message: 'ISBN inválido: confira os 10 ou 13 dígitos.' };
    });
    disabled(book.seriesPosition, ({ valueOf }) => valueOf(book.seriesId) === null);
    validate(book.seriesPosition, ({ value, valueOf }) =>
      seriesPositionError(valueOf(book.seriesId) !== null, value()),
    );
    validate(book.startDate, ({ value }) =>
      value() !== '' && value() > today()
        ? { kind: 'future', message: 'A data de início não pode ser no futuro.' }
        : undefined,
    );
    validate(book.endDate, ({ value, valueOf }) => {
      const end = value();
      if (end === '') {
        return undefined;
      }
      if (end > today()) {
        return { kind: 'future', message: 'A data não pode ser no futuro.' };
      }
      const start = valueOf(book.startDate);
      return start !== '' && end < start
        ? { kind: 'order', message: 'O fim da leitura não pode ser antes do início.' }
        : undefined;
    });
  };
}

/**
 * Series and position travel together, as book.series-position-required says on the back-end:
 * the position waits for a series, and a series asks for its position.
 */
export function seriesPositionError(
  hasSeries: boolean,
  position: number | null,
): { kind: string; message: string } | undefined {
  if (hasSeries && position === null) {
    return { kind: 'seriesPosition', message: 'Informe a posição do livro na série.' };
  }
  if (position !== null && position <= 0) {
    return { kind: 'seriesPosition', message: 'A posição na série começa em 0,1.' };
  }
  return undefined;
}

/** Field of the form a server-side field error belongs to, by the name the API uses. */
export const SERVER_FIELDS: Readonly<Record<string, keyof BookFormModel>> = {
  title: 'title',
  isbn13: 'isbn',
  isbn10: 'isbn',
  pageCount: 'pageCount',
  publishedYear: 'publishedYear',
  authorIds: 'authors',
  genreIds: 'genres',
  seriesPosition: 'seriesPosition',
};
