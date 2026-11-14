import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { components } from './schema';
import { Ownership } from './shelf-api';

type Schemas = components['schemas'];

export type BookDetailResponse = Schemas['BookDetailResponse'];
export type BookRequest = Schemas['BookRequest'];

/** What the two image sub-resources of a book are called in the URL. */
export type BookImage = 'cover' | 'banner';

@Injectable({ providedIn: 'root' })
export class BooksApi {
  private readonly http = inject(HttpClient);

  detailRequest(id: number): HttpResourceRequest {
    return { url: `/api/v1/books/${id}` };
  }

  create(request: BookRequest): Observable<BookDetailResponse> {
    return this.http.post<BookDetailResponse>('/api/v1/books', request);
  }

  update(id: number, request: BookRequest): Observable<BookDetailResponse> {
    return this.http.put<BookDetailResponse>(`/api/v1/books/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/books/${id}`);
  }

  setFavorite(id: number, favorite: boolean): Observable<void> {
    const url = `/api/v1/books/${id}/favorite`;
    return favorite ? this.http.put<void>(url, null) : this.http.delete<void>(url);
  }

  setOwnership(id: number, ownership: Ownership): Observable<void> {
    return this.http.put<void>(`/api/v1/books/${id}/ownership`, { ownership });
  }

  /** Multipart upload; the back-end checks the real format and the size. */
  uploadImage(id: number, image: BookImage, file: File): Observable<unknown> {
    const body = new FormData();
    body.append('file', file);
    return this.http.put(`/api/v1/books/${id}/${image}`, body);
  }

  removeImage(id: number, image: BookImage): Observable<void> {
    return this.http.delete<void>(`/api/v1/books/${id}/${image}`);
  }
}
