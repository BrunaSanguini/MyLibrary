import { HttpInterceptorFn } from '@angular/common/http';

/** The back-end refuses changes without this header (docs/erros.md, request.missing-header). */
export const REQUESTED_BY_HEADER = 'X-Requested-By';
export const REQUESTED_BY_VALUE = 'minha-livraria';

export const requestedByInterceptor: HttpInterceptorFn = (request, next) =>
  request.method === 'GET' || request.method === 'HEAD'
    ? next(request)
    : next(request.clone({ setHeaders: { [REQUESTED_BY_HEADER]: REQUESTED_BY_VALUE } }));
