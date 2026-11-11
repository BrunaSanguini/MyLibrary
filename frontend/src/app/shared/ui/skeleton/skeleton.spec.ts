import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('stays out of the accessibility tree', async () => {
    const { fixture } = await render(Skeleton, {});

    expect(fixture.nativeElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('marks the variant so the stylesheet can size it', async () => {
    const { fixture } = await render(Skeleton, { inputs: { variant: 'cover' } });

    expect(fixture.nativeElement).toHaveAttribute('data-variant', 'cover');
  });

  it('keeps the 2:3 proportion of a cover placeholder', async () => {
    const { fixture } = await render(Skeleton, { inputs: { variant: 'cover' } });

    const box = (fixture.nativeElement as HTMLElement).getBoundingClientRect();
    expect(box.width).toBe(176);
    expect(Math.round(box.height)).toBe(264);
  });

  it('accepts a width, so a paragraph does not look like a block', async () => {
    const { fixture } = await render(Skeleton, { inputs: { width: '60%' } });

    expect((fixture.nativeElement as HTMLElement).style.width).toBe('60%');
  });
});
