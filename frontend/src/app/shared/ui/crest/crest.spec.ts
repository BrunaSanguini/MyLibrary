import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { Crest } from './crest';

describe('Crest', () => {
  it('is decoration: hidden from assistive technology', async () => {
    const { container } = await render(Crest);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('is 28 px wide by default, in the proportion of the drawing', async () => {
    const { container } = await render(Crest);
    const svg = container.querySelector('svg')!;

    expect(svg).toHaveAttribute('width', '28');
    expect(svg).toHaveAttribute('height', '33');
  });

  it('keeps the proportion at another width', async () => {
    const { container } = await render(Crest, { inputs: { width: 60 } });
    const svg = container.querySelector('svg')!;

    expect(svg).toHaveAttribute('width', '60');
    expect(svg).toHaveAttribute('height', '70');
  });
});
