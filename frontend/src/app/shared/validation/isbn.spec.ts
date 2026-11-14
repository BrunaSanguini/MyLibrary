import { describe, expect, it } from 'vitest';

import { compactIsbn, isValidIsbn10, isValidIsbn13 } from './isbn';

/** Same cases as the back-end's IsbnsTest, so the two sides cannot drift apart unnoticed. */
describe('ISBN', () => {
  it.each(['9788595084742', '978-85-9508-474-2', '978 85 9508 474 2'])(
    'accepts the valid ISBN-13 %s',
    (isbn) => {
      expect(isValidIsbn13(isbn)).toBe(true);
    },
  );

  it.each(['9788595084743', '978859508474', '97885950847422', '978859508474X'])(
    'refuses the ISBN-13 %s',
    (isbn) => {
      expect(isValidIsbn13(isbn)).toBe(false);
    },
  );

  it.each(['8595084742', '85-9508-474-2', '043942089X', '043942089x'])(
    'accepts the valid ISBN-10 %s',
    (isbn) => {
      expect(isValidIsbn10(isbn)).toBe(true);
    },
  );

  it.each(['8595084743', '859508474', '85950847422', '04394208X9', '859508474Y'])(
    'refuses the ISBN-10 %s',
    (isbn) => {
      expect(isValidIsbn10(isbn)).toBe(false);
    },
  );

  it('keeps the check digit uppercase', () => {
    expect(compactIsbn('0-439-42089-x')).toBe('043942089X');
  });
});
