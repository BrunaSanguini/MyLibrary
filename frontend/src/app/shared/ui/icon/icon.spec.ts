import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { Icon } from './icon';

describe('Icon', () => {
  it('draws the icon with the current text color', async () => {
    const { container } = await render(Icon, { inputs: { name: 'moon' } });

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg?.querySelectorAll('path')).toHaveLength(1);
  });

  it('is hidden from assistive technology', async () => {
    const { container } = await render(Icon, { inputs: { name: 'sun' } });

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses the requested size', async () => {
    const { container } = await render(Icon, { inputs: { name: 'arrow-right', size: 16 } });

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg?.getBoundingClientRect().width).toBe(16);
  });
});
