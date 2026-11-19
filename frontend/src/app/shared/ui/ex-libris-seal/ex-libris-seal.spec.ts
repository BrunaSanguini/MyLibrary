import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { ExLibrisSeal } from './ex-libris-seal';

describe('ExLibrisSeal', () => {
  it('is decoration when it has no label', async () => {
    const { fixture } = await render(ExLibrisSeal);

    expect(fixture.nativeElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('is an image with the name when it says something, like the seal of a book that is yours', async () => {
    await render(ExLibrisSeal, { inputs: { label: 'Selo ex-libris: este livro é seu' } });

    expect(screen.getByRole('img', { name: 'Selo ex-libris: este livro é seu' })).toBeVisible();
  });

  it('is 64 px wide and tilted by -10 degrees by default', async () => {
    const { container } = await render(ExLibrisSeal);
    const svg = container.querySelector('svg')!;

    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
    expect(svg.style.transform).toBe('rotate(-10deg)');
  });

  it('takes another size and tilt', async () => {
    const { container } = await render(ExLibrisSeal, { inputs: { size: 96, rotation: -12 } });
    const svg = container.querySelector('svg')!;

    expect(svg).toHaveAttribute('width', '96');
    expect(svg.style.transform).toBe('rotate(-12deg)');
  });

  it('writes the motto around the star', async () => {
    const { container } = await render(ExLibrisSeal);

    expect(container.querySelector('textPath')).toHaveTextContent(
      'HIC LIBER MEUS EST · EX LIBRIS ·',
    );
  });

  it('draws each seal on its own arc, so two seals on a page do not share an id', async () => {
    const { container } = await render('<ml-ex-libris-seal /><ml-ex-libris-seal />', {
      imports: [ExLibrisSeal],
    });
    const ids = Array.from(container.querySelectorAll('defs path')).map((arc) => arc.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
