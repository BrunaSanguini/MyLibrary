import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from './api-error';
import { problemDetailsInterceptor } from './problem-details-interceptor';
import { REQUESTED_BY_HEADER, requestedByInterceptor } from './requested-by-interceptor';

describe('API interceptors', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([requestedByInterceptor, problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('requestedByInterceptor', () => {
    it('identifies changes as coming from the app', () => {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        http.request(method, '/api/v1/books/1').subscribe();

        const request = backend.expectOne({ method, url: '/api/v1/books/1' }).request;
        expect(request.headers.get(REQUESTED_BY_HEADER)).toBe('minha-livraria');
      }
    });

    it('leaves reads untouched', () => {
      http.get('/api/v1/books').subscribe();

      expect(backend.expectOne('/api/v1/books').request.headers.has(REQUESTED_BY_HEADER)).toBe(
        false,
      );
    });
  });

  describe('problemDetailsInterceptor', () => {
    it('turns an error response into an ApiError', async () => {
      const response = firstValueFrom(http.get('/api/v1/books/42'));

      backend
        .expectOne('/api/v1/books/42')
        .flush(
          { code: 'book.not-found', detail: 'Livro não encontrado.' },
          { status: 404, statusText: 'Not Found' },
        );

      const error = await response.catch((error: unknown) => error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 404, code: 'book.not-found' });
    });

    it('lets successful responses through', async () => {
      const response = firstValueFrom(http.get('/api/v1/books/42'));

      backend.expectOne('/api/v1/books/42').flush({ id: 42 });

      await expect(response).resolves.toEqual({ id: 42 });
    });
  });
});
