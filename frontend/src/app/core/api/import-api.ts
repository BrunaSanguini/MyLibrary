import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BookDetailResponse } from './books-api';
import { components } from './schema';

type Schemas = components['schemas'];

export type ImportCandidateResponse = Schemas['ImportCandidateResponse'];
export type ImportPreviewResponse = Schemas['ImportPreviewResponse'];
export type ImportRequest = Schemas['ImportRequest'];

/** An edition is previewed by its ISBN or by its Open Library key, never both. */
export type EditionLookup = { readonly isbn: string } | { readonly editionKey: string };

/** Codes of docs/erros.md for a failure of the Open Library, not of the request. */
const OPEN_LIBRARY_OUTAGES: readonly string[] = [
  'openlibrary.bad-response',
  'openlibrary.unavailable',
  'openlibrary.timeout',
];

/** True when the Open Library could not answer, so registering by hand is the way forward. */
export function isOpenLibraryOutage(code: string): boolean {
  return OPEN_LIBRARY_OUTAGES.includes(code);
}

/** Importing books from the Open Library: search, preview and confirmation. */
@Injectable({ providedIn: 'root' })
export class ImportApi {
  private readonly http = inject(HttpClient);

  /** Up to 20 results by title or author, asked only when the reader clicks Buscar. */
  search(q: string): Observable<ImportCandidateResponse[]> {
    return this.http.get<ImportCandidateResponse[]>('/api/v1/books/import/search', {
      params: { q },
    });
  }

  /** Everything the Open Library knows about one edition; nothing is saved. */
  preview(lookup: EditionLookup): Observable<ImportPreviewResponse> {
    return this.http.get<ImportPreviewResponse>('/api/v1/books/import/preview', {
      params: { ...lookup },
    });
  }

  importEdition(request: ImportRequest): Observable<BookDetailResponse> {
    return this.http.post<BookDetailResponse>('/api/v1/books/import', request);
  }
}
