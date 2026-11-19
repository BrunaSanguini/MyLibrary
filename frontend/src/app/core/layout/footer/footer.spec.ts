import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { Footer } from './footer';

describe('Footer', () => {
  it('is the content info of the page, with the name and the motto', async () => {
    await render(Footer);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText('Ex·Libru')).toBeInTheDocument();
    expect(screen.getByText('Hic liber meus est · sua biblioteca pessoal')).toBeInTheDocument();
  });

  it('has the seal, which is decoration and has no name of its own', async () => {
    const { container } = await render(Footer);

    expect(container.querySelector('ml-ex-libris-seal')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('has no links or buttons: it is a signature, not navigation', async () => {
    await render(Footer);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
