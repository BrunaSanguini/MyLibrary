import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { RatingStars } from './rating-stars';

describe('RatingStars', () => {
  it('announces the rating in Portuguese, with a comma', async () => {
    await render(RatingStars, { inputs: { value: 4.5 } });

    expect(screen.getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
  });

  it('says so when the book has no rating yet', async () => {
    await render(RatingStars, {});

    expect(screen.getByRole('img', { name: 'Sem nota ainda' })).toBeInTheDocument();
  });

  it('fills half the stars for a half point', async () => {
    const { container } = await render(RatingStars, { inputs: { value: 2.5 } });

    expect(container.querySelector<HTMLElement>('.filled')!.style.width).toBe('50%');
  });

  it('keeps a value outside the scale inside it', async () => {
    const { container } = await render(RatingStars, { inputs: { value: 9 } });

    expect(container.querySelector<HTMLElement>('.filled')!.style.width).toBe('100%');
  });

  it('hides the glyphs from assistive technology, which reads the label instead', async () => {
    const { container } = await render(RatingStars, { inputs: { value: 3 } });

    for (const layer of container.querySelectorAll('.empty, .filled')) {
      expect(layer).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
