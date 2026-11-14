import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { components } from './schema';

type Schemas = components['schemas'];

export type AuthorResponse = Schemas['AuthorResponse'];
export type PublisherResponse = Schemas['PublisherResponse'];
export type SeriesResponse = Schemas['SeriesResponse'];

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

  createGenre(name: string): Observable<NamedEntry> {
    return this.http
      .post<NamedEntry>('/api/v1/genres', { name, parentId: null })
      .pipe(map(({ id, name: created }) => ({ id, name: created })));
  }
}
