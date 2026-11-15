import { Injectable } from '@angular/core';
import { HttpResourceRequest } from '@angular/common/http';

import { BookCardData } from '@shared/ui/book-card/book-card';

import { components } from './schema';

export type BookCardResponse = components['schemas']['BookCardResponse'];
export type ShelfPage = components['schemas']['PageResponseBookCardResponse'];
export type RelatedBooksResponse = components['schemas']['RelatedBooksResponse'];
export type Ownership = NonNullable<BookCardResponse['ownership']>;
export type ShelfStatus = BookCardResponse['status'];

/** Sort fields the shelf accepts; anything else is rejected with request.invalid-sort. */
export const SHELF_SORTS = [
  'addedAt',
  'title',
  'author',
  'seriesPosition',
  'rating',
  'finishedAt',
] as const;
export type ShelfSort = (typeof SHELF_SORTS)[number];

/** These two only make sense from the best or the latest down; the others keep the API default. */
const DESCENDING_SORTS: readonly ShelfSort[] = ['rating', 'finishedAt'];

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
  readonly genreId?: number;
  readonly authorId?: number;
  readonly publisherId?: number;
  readonly seriesId?: number;
  readonly sort?: ShelfSort;
  readonly page?: number;
  readonly size?: number;
}

@Injectable({ providedIn: 'root' })
export class ShelfApi {
  /**
   * Request for `httpResource`, which re-fetches whenever the filters change.
   *
   * <p>Only the filters that are set go in the query string: an empty one would reach the API as
   * `?q=` and show up in the address bar for nothing.
   */
  booksRequest(filter: ShelfFilter): HttpResourceRequest {
    return { url: '/api/v1/shelf/books', params: paramsOf(filter) };
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
