import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { ListCovers } from './list-covers';

describe('ListCovers', () => {
  it('puts the first cover in front, the second to the right and the third to the left', async () => {
    const { container } = await render(ListCovers, {
      inputs: { name: 'Fantasia', color: 'FOREST', coverUrls: ['/a.webp', '/b.webp', '/c.webp'] },
    });

    const sources = (selector: string) =>
      container.querySelector<HTMLImageElement>(`${selector} img`)?.getAttribute('src');
    expect(sources('.front')).toBe('/a.webp');
    expect(sources('.right')).toBe('/b.webp');
    expect(sources('.left')).toBe('/c.webp');
    expect(container.querySelector('.front')).not.toHaveTextContent('Fantasia');
  });

  it('is decoration only, the size of a card and without the arch by default', async () => {
    const card = await render(ListCovers, { inputs: { name: 'Fantasia', color: 'FOREST' } });
    expect(card.fixture.nativeElement).toHaveAttribute('aria-hidden', 'true');
    expect(card.fixture.nativeElement).toHaveAttribute('data-size', 'card');
    expect(card.container.querySelector('.arch')).toBeNull();
  });

  it('draws the arch on the pinned list and the name on the colour of the list', async () => {
    const pinned = await render(ListCovers, {
      inputs: { name: 'Fantasia', color: 'SEAL', size: 'pinned' },
    });
    expect(pinned.fixture.nativeElement).toHaveAttribute('data-size', 'pinned');
    expect(pinned.container.querySelector('.arch')).not.toBeNull();
    expect(pinned.container.querySelector<HTMLElement>('.front')?.style.background).toBe(
      'var(--ml-color-book-red)',
    );
  });
});
