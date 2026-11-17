import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';

import { components } from './schema';
import { BookCardResponse, ShelfPage } from './shelf-api';

type Schemas = components['schemas'];

export type BookListResponse = Schemas['BookListResponse'];
export type BookListRequest = Schemas['BookListRequest'];
export type ListsPage = Schemas['PageResponseBookListResponse'];

/** The API serves at most this many items per page. */
const LARGEST_PAGE = 100;

/** Lists of books: the lists themselves and the books of each one, in the order of the list. */
@Injectable({ providedIn: 'root' })
export class ListsApi {
  private readonly http = inject(HttpClient);

  /** Cards by name. */
  listRequest(page = 0, size = 24): HttpResourceRequest {
    return { url: '/api/v1/lists', params: { page, size } };
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
  if (list.bookCount === 0) {
    return 'Nenhum livro ainda';
  }
  const read = list.readCount === 1 ? '1 lido' : `${list.readCount} lidos`;
  return `${read} de ${list.bookCount}`;
}
