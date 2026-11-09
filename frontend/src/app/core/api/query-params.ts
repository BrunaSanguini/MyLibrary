/**
 * Conversions for query params received as input() (withComponentInputBinding).
 * The URL is editable, so invalid values are dropped before they reach a request.
 * The back-end validates again.
 */

const MAX_SEARCH_LENGTH = 200;
const PAGE_INDEX = /^\d{1,9}$/;

/** Page index from the URL: digits only (no sign, decimals or exponent), or 0. */
export function toPageIndex(value: unknown): number {
  return typeof value === 'string' && PAGE_INDEX.test(value) ? Number(value) : 0;
}

/** Search term from the URL: trimmed, at most 200 characters, or undefined when empty. */
export function toSearchTerm(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const term = value.trim().slice(0, MAX_SEARCH_LENGTH);
  return term === '' ? undefined : term;
}

/**
 * Creates a conversion that accepts only the given values, such as the shelf statuses:
 * `const toShelfStatus = toOneOf(SHELF_STATUSES);`
 */
export function toOneOf<T extends string>(
  allowed: readonly T[],
): (value: unknown) => T | undefined {
  return (value) => allowed.find((option) => option === value);
}
