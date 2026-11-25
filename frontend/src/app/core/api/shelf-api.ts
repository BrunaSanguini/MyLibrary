import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';

import { BookCardData } from '@shared/ui/book-card/book-card';

import { components } from './schema';

export type BookCardResponse = components['schemas']['BookCardResponse'];
export type ShelfPage = components['schemas']['PageResponseBookCardResponse'];
export type RelatedBooksResponse = components['schemas']['RelatedBooksResponse'];
export type Ownership = NonNullable<BookCardResponse['ownership']>;
export type ShelfStatus = BookCardResponse['status'];
export type ShelfSummary = components['schemas']['ShelfSummaryResponse'];

/** Sort fields the shelf accepts; anything else is rejected with request.invalid-sort. */
export const SHELF_SORTS = [
  'addedAt',
  'title',
  'author',
  'seriesPosition',
  'rating',
  'finishedAt',
  'publishedYear',
] as const;
export type ShelfSort = (typeof SHELF_SORTS)[number];

/** These only make sense from the best or the latest down; the others keep the API default. */
const DESCENDING_SORTS: readonly ShelfSort[] = ['rating', 'finishedAt', 'publishedYear'];

export const SHELF_STATUSES = [
  'READING',
  'WANT_TO_READ',
  'READ',
  'ABANDONED',
] as const satisfies readonly ShelfStatus[];

export const OWNERSHIPS = ['OWNED', 'WISHLIST', 'NONE'] as const satisfies readonly Ownership[];

/** Filters of the shelf listing, all optional and combined with AND by the back-end. */
export interface ShelfFilter {
  readonly q?: string;
  /** Any of them; empty means every status. */
  readonly status?: readonly ShelfStatus[];
  readonly ownership?: Ownership;
  readonly favorite?: boolean;
  /** Read more than once, or with a reading marked as a reread. */
  readonly reread?: boolean;
  readonly genreId?: number;
  readonly authorId?: number;
  readonly publisherId?: number;
  readonly seriesId?: number;
  /** False leaves the wishlist out, as Minha Estante does; true keeps only it. */
  readonly wishlist?: boolean;
  readonly sort?: ShelfSort;
  readonly page?: number;
  readonly size?: number;
}

/** The API serves at most this many items per page. */
const LARGEST_PAGE = 100;

@Injectable({ providedIn: 'root' })
export class ShelfApi {
  private readonly http = inject(HttpClient);

  /**
   * Request for `httpResource`, which re-fetches whenever the filters change.
   *
   * <p>Only the filters that are set go in the query string: an empty one would reach the API as
   * `?q=` and show up in the address bar for nothing.
   */
  booksRequest(filter: ShelfFilter): HttpResourceRequest {
    return { url: '/api/v1/shelf/books', params: paramsOf(filter) };
  }

  /**
   * Every book of the shelf, by title, walking the pages until the last one. For the panel that
   * adds books to a list, which shows the whole library and filters it as the reader types, and
   * for Catálogos, which counts the shelf by genre, author and series (`wishlist: false`).
   */
  allBooks(options: { wishlist?: boolean } = {}): Observable<BookCardResponse[]> {
    const pageOf = (page: number) =>
      this.http.get<ShelfPage>('/api/v1/shelf/books', {
        params: {
          sort: 'title,asc',
          page,
          size: LARGEST_PAGE,
          ...(options.wishlist === undefined ? {} : { wishlist: options.wishlist }),
        },
      });
    return pageOf(0).pipe(
      expand((current) =>
        current.page + 1 < current.totalPages ? pageOf(current.page + 1) : EMPTY,
      ),
      map((current) => current.content),
      reduce((all, content) => [...all, ...content], [] as BookCardResponse[]),
    );
  }

  /** How many books each tab and chip of Minha Estante holds. */
  summaryRequest(): HttpResourceRequest {
    return { url: '/api/v1/shelf/summary' };
  }

  /** The other books of the series and the ones with subgenres in common. */
  relatedRequest(bookId: number): HttpResourceRequest {
    return { url: `/api/v1/shelf/books/${bookId}/related` };
  }
}

type ParamValue = string | number | boolean | readonly string[];

function paramsOf(filter: ShelfFilter): Record<string, ParamValue> {
  const params: Record<string, ParamValue> = {};
  for (const [name, value] of Object.entries(filter)) {
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    params[name] = value as ParamValue;
  }
  if (filter.sort && DESCENDING_SORTS.includes(filter.sort)) {
    params['sort'] = `${filter.sort},desc`;
  }
  return params;
}

/** The card as the shared component draws it, from the card the API sends. */
export function toBookCard(book: BookCardResponse): BookCardData {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors,
    coverUrl: book.coverUrl,
    status: book.status,
    // The API sends an absent rating as null, which the card must not read as "zero stars".
    rating: book.rating ?? undefined,
    progress: book.progress?.percent,
    seriesName: book.series?.name,
    seriesPosition: book.series?.position,
  };
}
