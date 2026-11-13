import { Injectable } from '@angular/core';
import { HttpResourceRequest } from '@angular/common/http';

import { components } from './schema';

export type BookCardResponse = components['schemas']['BookCardResponse'];
export type ShelfPage = components['schemas']['PageResponseBookCardResponse'];
export type Ownership = NonNullable<BookCardResponse['ownership']>;

/** Sort fields the shelf accepts; anything else is rejected with request.invalid-sort. */
export const SHELF_SORTS = ['addedAt', 'title', 'author', 'seriesPosition'] as const;
export type ShelfSort = (typeof SHELF_SORTS)[number];

export const OWNERSHIPS = ['OWNED', 'WISHLIST', 'NONE'] as const satisfies readonly Ownership[];

/** Filters of the shelf listing, all optional and combined with AND by the back-end. */
export interface ShelfFilter {
  readonly q?: string;
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
}

function paramsOf(filter: ShelfFilter): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  for (const [name, value] of Object.entries(filter)) {
    if (value !== undefined && value !== '') {
      params[name] = value as string | number | boolean;
    }
  }
  return params;
}
