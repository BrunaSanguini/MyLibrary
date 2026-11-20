import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';

import { components } from './schema';
import { BookCardResponse, ShelfPage } from './shelf-api';

type Schemas = components['schemas'];

export type BookListResponse = Schemas['BookListResponse'];
export type BookListRequest = Schemas['BookListRequest'];
export type ListsPage = Schemas['PageResponseBookListResponse'];
/** How far the reading of a list is: no book read, some of them, or all of them. */
export type ListStatus = BookListResponse['status'];
/** The cover colour of a list, one of the six of the design system. */
export type ListColor = BookListResponse['color'];

/** What the cards of the Listas page can be narrowed by; the pinned list never is one of them. */
export interface ListCardsFilter {
  readonly status?: ListStatus;
  readonly page?: number;
  readonly size?: number;
}

/** The API serves at most this many items per page. */
const LARGEST_PAGE = 100;

/** Lists of books: the lists themselves and the books of each one, in the order of the list. */
@Injectable({ providedIn: 'root' })
export class ListsApi {
  private readonly http = inject(HttpClient);

  /** Cards by name, or the ones changed last. */
  listRequest(page = 0, size = 24, sort: 'name' | 'updatedAt' = 'name'): HttpResourceRequest {
    const params = { page, size, ...(sort === 'updatedAt' ? { sort: 'updatedAt,desc' } : {}) };
    return { url: '/api/v1/lists', params };
  }

  /**
   * The cards of the Listas page: the lists changed last first, without the pinned one, which has a
   * place of its own on the page. The API caps a page at 100.
   */
  cardsRequest({
    status,
    page = 0,
    size = LARGEST_PAGE,
  }: ListCardsFilter = {}): HttpResourceRequest {
    return {
      url: '/api/v1/lists',
      params: { pinned: false, ...(status ? { status } : {}), page, size, sort: 'updatedAt,desc' },
    };
  }

  /**
   * How many cards a filter has. One card per page is enough: the answer is `totalElements`, which
   * comes already filtered, so the tabs count without bringing every list.
   */
  countRequest(status?: ListStatus): HttpResourceRequest {
    return {
      url: '/api/v1/lists',
      params: { pinned: false, ...(status ? { status } : {}), size: 1 },
    };
  }

  /** The pinned list, if there is one: only one list is pinned at a time. */
  pinnedRequest(): HttpResourceRequest {
    return { url: '/api/v1/lists', params: { pinned: true, size: 1 } };
  }

  oneRequest(id: number): HttpResourceRequest {
    return { url: `/api/v1/lists/${id}` };
  }

  /**
   * Every book of a list, in its order. Reordering needs the whole list at hand, so this walks
   * the pages of the shelf until the last one instead of showing one page at a time.
   */
  books(id: number): Observable<BookCardResponse[]> {
    const pageOf = (page: number) =>
      this.http.get<ShelfPage>('/api/v1/shelf/books', {
        params: { listId: id, sort: 'listOrder,asc', page, size: LARGEST_PAGE },
      });
    return pageOf(0).pipe(
      expand((current) =>
        current.page + 1 < current.totalPages ? pageOf(current.page + 1) : EMPTY,
      ),
      map((current) => current.content),
      reduce((all, content) => [...all, ...content], [] as BookCardResponse[]),
    );
  }

  create(request: BookListRequest): Observable<BookListResponse> {
    return this.http.post<BookListResponse>('/api/v1/lists', request);
  }

  update(id: number, request: BookListRequest): Observable<BookListResponse> {
    return this.http.put<BookListResponse>(`/api/v1/lists/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/lists/${id}`);
  }

  /** At the end of the list; a book that is already there stays where it is. */
  addBook(id: number, bookId: number): Observable<void> {
    return this.http.put<void>(`/api/v1/lists/${id}/books/${bookId}`, null);
  }

  removeBook(id: number, bookId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/lists/${id}/books/${bookId}`);
  }

  /** `bookIds` has to be exactly the books of the list, each one once. */
  reorder(id: number, bookIds: readonly number[]): Observable<void> {
    return this.http.put<void>(`/api/v1/lists/${id}/order`, { bookIds });
  }
}

/** `2 de 5 lidos`, the line every card of a list shows. */
export function readCountOf(list: Pick<BookListResponse, 'bookCount' | 'readCount'>): string {
  return `${list.readCount} de ${list.bookCount} lidos`;
}

/** How much of a list was read, rounded: 5 of 8 is 63. An empty list is at 0. */
export function percentOf(list: Pick<BookListResponse, 'bookCount' | 'readCount'>): number {
  return list.bookCount === 0
    ? 0
    : Math.min(Math.round((list.readCount / list.bookCount) * 100), 100);
}

const STATUS_LABELS: Readonly<Record<ListStatus, string>> = {
  NOT_STARTED: 'Não iniciada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
};

/** `Em andamento`; the card writes it in capitals. */
export function statusLabelOf(status: ListStatus): string {
  return STATUS_LABELS[status];
}
