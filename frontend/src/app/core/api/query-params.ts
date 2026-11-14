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

/**
 * Positive integer id from the URL (a route parameter or a filter), or undefined. Anything else,
 * such as `abc`, `0` or `-3`, is not an id the API could have issued.
 */
export function toId(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return undefined;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

/** Only "true" and "false" count; anything else leaves the filter off. */
export function toFlag(value: unknown): boolean | undefined {
  return value === 'true' ? true : value === 'false' ? false : undefined;
}
