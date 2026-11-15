import { describe, expect, it } from 'vitest';

import { isOpenLibraryOutage } from './import-api';

describe('isOpenLibraryOutage', () => {
  it.each(['openlibrary.bad-response', 'openlibrary.unavailable', 'openlibrary.timeout'])(
    'treats %s as the Open Library being out of reach',
    (code) => {
      expect(isOpenLibraryOutage(code)).toBe(true);
    },
  );

  it.each(['openlibrary.not-found', 'internal.error', 'network.unavailable', 'validation'])(
    'does not treat %s as an outage of the Open Library',
    (code) => {
      expect(isOpenLibraryOutage(code)).toBe(false);
    },
  );
});
