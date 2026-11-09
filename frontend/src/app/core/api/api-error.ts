import { HttpErrorResponse } from '@angular/common/http';

/** One entry of the "errors" list of a validation problem (code "validation"). */
export interface FieldError {
  readonly field: string;
  readonly message: string;
}

/** Codes created by the front-end itself, when the API did not answer with Problem Details. */
export const NETWORK_UNAVAILABLE = 'network.unavailable';
export const UNEXPECTED_RESPONSE = 'response.unexpected';

const NETWORK_UNAVAILABLE_DETAIL =
  'Não foi possível falar com a Minha Livraria. Verifique se o aplicativo continua aberto.';
const UNEXPECTED_RESPONSE_DETAIL = 'Algo deu errado. Tente de novo.';

/**
 * Error of a call to the API, with the stable code of docs/erros.md.
 * Each page handles the codes it knows and shows the detail of the others.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly fieldErrors: readonly FieldError[];

  constructor(
    status: number,
    code: string,
    detail: string,
    fieldErrors: readonly FieldError[] = [],
  ) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }
    if (!(error instanceof HttpErrorResponse)) {
      return new ApiError(0, UNEXPECTED_RESPONSE, UNEXPECTED_RESPONSE_DETAIL);
    }
    if (error.status === 0) {
      return new ApiError(0, NETWORK_UNAVAILABLE, NETWORK_UNAVAILABLE_DETAIL);
    }

    const body: unknown = error.error;
    if (!isProblem(body)) {
      return new ApiError(error.status, UNEXPECTED_RESPONSE, UNEXPECTED_RESPONSE_DETAIL);
    }
    return new ApiError(
      error.status,
      body.code,
      typeof body.detail === 'string' ? body.detail : UNEXPECTED_RESPONSE_DETAIL,
      Array.isArray(body.errors) ? body.errors.filter(isFieldError) : [],
    );
  }
}

interface ProblemBody {
  readonly code: string;
  readonly detail?: unknown;
  readonly errors?: unknown;
}

function isProblem(body: unknown): body is ProblemBody {
  return (
    typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string'
  );
}

function isFieldError(value: unknown): value is FieldError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'field' in value &&
    typeof value.field === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}
