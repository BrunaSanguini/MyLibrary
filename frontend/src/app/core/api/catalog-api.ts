import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce } from 'rxjs';

import { components } from './schema';

type Schemas = components['schemas'];

export type AuthorResponse = Schemas['AuthorResponse'];
export type PublisherResponse = Schemas['PublisherResponse'];
export type SeriesResponse = Schemas['SeriesResponse'];
type AuthorsPage = Schemas['PageResponseAuthorResponse'];

/** The API serves at most this many items per page. */
const LARGEST_PAGE = 100;

/** The three catalogs that are searched by name and paginated; genres are a tree (GenresApi). */
export type CatalogKind = 'authors' | 'publishers' | 'series';

/** The least a picker needs from any catalog entry. */
export interface NamedEntry {
  readonly id: number;
  readonly name: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);

  /** Listing by name, accent-insensitive on the back-end; `q` empty brings everything. */
  listRequest(kind: CatalogKind, q?: string, page = 0, size = 24): HttpResourceRequest {
    const params: Record<string, string | number> = { page, size };
    if (q) {
      params['q'] = q;
    }
    return { url: `/api/v1/${kind}`, params };
  }

  entryRequest(kind: CatalogKind, id: number): HttpResourceRequest {
    return { url: `/api/v1/${kind}/${id}` };
  }

  /** Creates an entry on the spot, when the form is given a name that does not exist yet. */
  create(kind: CatalogKind, name: string): Observable<NamedEntry> {
    return this.http
      .post<NamedEntry>(`/api/v1/${kind}`, { name })
      .pipe(map(({ id, name: created }) => ({ id, name: created })));
  }

  /**
   * Every author or publisher, by name, walking the pages until the last one: Configurações lists
   * them all and filters as the reader types.
   */
  all(kind: 'authors' | 'publishers'): Observable<(AuthorResponse | PublisherResponse)[]> {
    const pageOf = (page: number) =>
      this.http.get<AuthorsPage>(`/api/v1/${kind}`, {
        params: { page, size: LARGEST_PAGE, sort: 'name,asc' },
      });
    return pageOf(0).pipe(
      expand((current) =>
        current.page + 1 < current.totalPages ? pageOf(current.page + 1) : EMPTY,
      ),
      map((current) => current.content),
      reduce((all, content) => [...all, ...content], [] as AuthorResponse[]),
    );
  }

  /** An author or a publisher with books is refused by the API (author.has-books). */
  delete(kind: CatalogKind, id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/${kind}/${id}`);
  }

  /** A genre with subgenres is refused by the API (genre.has-subgenres): they go first. */
  deleteGenre(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/genres/${id}`);
  }

  /** A genre, or a subgenre of `parentId`. */
  createGenre(name: string, parentId: number | null = null): Observable<NamedEntry> {
    return this.http
      .post<NamedEntry>('/api/v1/genres', { name, parentId })
      .pipe(map(({ id, name: created }) => ({ id, name: created })));
  }
}
