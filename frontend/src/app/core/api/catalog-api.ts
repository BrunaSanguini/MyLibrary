import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, Observable, of, reduce, switchMap } from 'rxjs';

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
   * Every author, publisher or series, by name, walking the pages until the last one: Configurações
   * lists them all and filters as the reader types, and the selects of Minha Estante offer them all.
   */
  all(kind: CatalogKind): Observable<(AuthorResponse | PublisherResponse | SeriesResponse)[]> {
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

  /**
   * The entry with this name, or a new one when there is none: the data brought from the Open
   * Library names authors and publishers, and the form works with ids.
   */
  findOrCreate(kind: CatalogKind, name: string): Observable<NamedEntry> {
    const wanted = normalizeName(name);
    return this.http
      .get<AuthorsPage>(`/api/v1/${kind}`, { params: { q: name, page: 0, size: 20 } })
      .pipe(
        switchMap((page) => {
          const found = page.content.find((entry) => normalizeName(entry.name) === wanted);
          return found ? of({ id: found.id, name: found.name }) : this.create(kind, name);
        }),
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

/** Same idea as the back-end's TextNormalizer: no accents, no case, single spaces. */
function normalizeName(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
