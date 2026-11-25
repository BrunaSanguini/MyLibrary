import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { components } from './schema';

type Schemas = components['schemas'];

export type ReadingResponse = Schemas['ReadingResponse'];
export type ReadingRequest = Schemas['ReadingRequest'];
export type ReadingPeriodRequest = Schemas['ReadingPeriodRequest'];
export type ReadingStatus = ReadingResponse['status'];
export type SessionResponse = Schemas['SessionResponse'];
export type SessionRequest = Schemas['SessionRequest'];
export type ReviewResponse = Schemas['ReviewResponse'];
export type ReviewRequest = Schemas['ReviewRequest'];
export type ReviewSummary = Schemas['ReviewSummaryResponse'];
export type ReviewsPage = Schemas['PageResponseReviewSummaryResponse'];

/** The code the API answers when a book simply has no review yet, which is not a failure. */
export const NO_REVIEW = 'review.not-found';

/** Where a book stands, in the words the shelf uses. */
export type BookReadingStatus = 'WANT_TO_READ' | 'READING' | 'READ' | 'ABANDONED';

/**
 * The status of a book from its readings, the same rule the shelf applies in SQL. The API already
 * lists the reading in progress first and then the latest ones, so the first reading decides.
 */
export function bookStatusOf(readings: readonly ReadingResponse[]): BookReadingStatus {
  const latest = readings[0];
  if (!latest) {
    return 'WANT_TO_READ';
  }
  if (latest.status === 'IN_PROGRESS') {
    return 'READING';
  }
  return latest.status === 'FINISHED' ? 'READ' : 'ABANDONED';
}

export const BOOK_STATUS_LABELS: Readonly<Record<BookReadingStatus, string>> = {
  WANT_TO_READ: 'Quero ler',
  READING: 'Lendo',
  READ: 'Lido',
  ABANDONED: 'Abandonado',
};

/** Readings of a book, the sessions of each reading and the review. */
@Injectable({ providedIn: 'root' })
export class ReadingApi {
  private readonly http = inject(HttpClient);

  /** The reading in progress first, then from the latest to the oldest. */
  readingsRequest(bookId: number): HttpResourceRequest {
    return { url: `/api/v1/books/${bookId}/readings` };
  }

  sessionsRequest(readingId: number): HttpResourceRequest {
    return { url: `/api/v1/readings/${readingId}/sessions` };
  }

  sessions(readingId: number): Observable<SessionResponse[]> {
    return this.http.get<SessionResponse[]>(`/api/v1/readings/${readingId}/sessions`);
  }

  /** Answers 404 with {@link NO_REVIEW} for a book without review. */
  reviewRequest(bookId: number): HttpResourceRequest {
    return { url: `/api/v1/books/${bookId}/review` };
  }

  /** The reviews written or changed last. */
  latestReviewsRequest(size: number): HttpResourceRequest {
    return { url: '/api/v1/reviews', params: { size, sort: 'updatedAt,desc' } };
  }

  createReading(bookId: number, request: ReadingRequest): Observable<ReadingResponse> {
    return this.http.post<ReadingResponse>(`/api/v1/books/${bookId}/readings`, request);
  }

  updateReading(id: number, request: ReadingPeriodRequest): Observable<ReadingResponse> {
    return this.http.put<ReadingResponse>(`/api/v1/readings/${id}`, request);
  }

  finishReading(id: number, endDate: string): Observable<ReadingResponse> {
    return this.http.post<ReadingResponse>(`/api/v1/readings/${id}/finish`, { endDate });
  }

  abandonReading(id: number, endDate: string): Observable<ReadingResponse> {
    return this.http.post<ReadingResponse>(`/api/v1/readings/${id}/abandon`, { endDate });
  }

  /** The readings of a book, the one in progress first, then from the latest to the oldest. */
  readings(bookId: number): Observable<ReadingResponse[]> {
    return this.http.get<ReadingResponse[]>(`/api/v1/books/${bookId}/readings`);
  }

  /** An abandoned reading in progress again, from the same start. */
  resumeReading(id: number): Observable<ReadingResponse> {
    return this.http.post<ReadingResponse>(`/api/v1/readings/${id}/resume`, {});
  }

  deleteReading(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/readings/${id}`);
  }

  addSession(readingId: number, request: SessionRequest): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`/api/v1/readings/${readingId}/sessions`, request);
  }

  deleteSession(readingId: number, sessionId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/readings/${readingId}/sessions/${sessionId}`);
  }

  saveReview(bookId: number, request: ReviewRequest): Observable<ReviewResponse> {
    return this.http.put<ReviewResponse>(`/api/v1/books/${bookId}/review`, request);
  }

  deleteReview(bookId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/books/${bookId}/review`);
  }
}

/**
 * The page reached after each session, in the order they were read: what a note says when it
 * shows where it was written (P. 312).
 */
export function pageAfterEachSession(sessions: readonly SessionResponse[]): Map<number, number> {
  const pages = new Map<number, number>();
  let total = 0;
  for (const session of [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)) {
    total += session.pagesRead;
    pages.set(session.id, total);
  }
  return pages;
}
