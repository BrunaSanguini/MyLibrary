import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { Wordmark } from './wordmark';

describe('Wordmark', () => {
  it('is read as the name, not letter by letter', async () => {
    const { container } = await render(Wordmark);

    expect(screen.getByText('Ex·Libru')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('EX·LIBRU');
  });
});
