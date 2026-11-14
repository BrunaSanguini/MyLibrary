/**
 * Check digits of the two ISBN formats (ISO 2108), mirroring the back-end's Isbns class so the
 * form refuses exactly what the API would refuse.
 */

/** The number without hyphens or spaces, with a lowercase x turned into X. */
export function compactIsbn(isbn: string): string {
  return isbn.replace(/[\s-]/g, '').toUpperCase();
}

/** 13 digits whose weighted sum (1, 3, 1, 3...) is a multiple of 10. */
export function isValidIsbn13(isbn: string): boolean {
  const compact = compactIsbn(isbn);
  if (!/^\d{13}$/.test(compact)) {
    return false;
  }
  const sum = [...compact].reduce(
    (total, digit, position) => total + Number(digit) * (position % 2 === 0 ? 1 : 3),
    0,
  );
  return sum % 10 === 0;
}

/** 9 digits plus a check digit (0-9 or X) whose weighted sum (10, 9, 8...) is a multiple of 11. */
export function isValidIsbn10(isbn: string): boolean {
  const compact = compactIsbn(isbn);
  if (!/^\d{9}[\dX]$/.test(compact)) {
    return false;
  }
  const sum = [...compact].reduce(
    (total, character, position) =>
      total + (10 - position) * (character === 'X' ? 10 : Number(character)),
    0,
  );
  return sum % 11 === 0;
}
