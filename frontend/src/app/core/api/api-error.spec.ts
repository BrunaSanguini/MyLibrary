import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { ApiError, NETWORK_UNAVAILABLE, UNEXPECTED_RESPONSE } from './api-error';

describe('ApiError.from', () => {
  it('keeps the code and the detail of a Problem Details response', () => {
    const error = ApiError.from(
      new HttpErrorResponse({
        status: 409,
        error: {
          type: 'https://github.com/BrunaSanguini/MyLibrary/blob/main/docs/erros.md#book-isbn-duplicated',
          title: 'ISBN já cadastrado',
          status: 409,
          detail: 'Já existe um livro com este ISBN.',
          code: 'book.isbn-duplicated',
        },
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.code).toBe('book.isbn-duplicated');
    expect(error.detail).toBe('Já existe um livro com este ISBN.');
    expect(error.fieldErrors).toEqual([]);
  });

  it('exposes the invalid fields of a validation problem', () => {
    const error = ApiError.from(
      new HttpErrorResponse({
        status: 400,
        error: {
          code: 'validation',
          detail: 'Um ou mais campos não passaram na validação.',
          errors: [{ field: 'title', message: 'não deve estar em branco' }, { field: 1 }],
        },
      }),
    );

    expect(error.fieldErrors).toEqual([{ field: 'title', message: 'não deve estar em branco' }]);
  });

  it('reports the app as unavailable when the request did not reach it', () => {
    const error = ApiError.from(
      new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
    );

    expect(error.code).toBe(NETWORK_UNAVAILABLE);
    expect(error.detail).toContain('Verifique se o aplicativo continua aberto');
  });

  it('uses a generic message when the response is not Problem Details', () => {
    const error = ApiError.from(
      new HttpErrorResponse({ status: 502, error: '<html>Bad Gateway</html>' }),
    );

    expect(error.status).toBe(502);
    expect(error.code).toBe(UNEXPECTED_RESPONSE);
  });

  it('returns the same instance when it is already an ApiError', () => {
    const original = new ApiError(404, 'book.not-found', 'Livro não encontrado.');

    expect(ApiError.from(original)).toBe(original);
  });
});
