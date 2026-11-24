import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { ProgressBar } from './progress-bar';

describe('ProgressBar', () => {
  it('reads as a progressbar with its value and bounds', async () => {
    await render(ProgressBar, { inputs: { value: 62 } });

    const bar = screen.getByRole('progressbar', { name: 'Progresso de leitura' });
    expect(bar).toHaveAttribute('aria-valuenow', '62');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('fills the track by the percentage', async () => {
    const { container } = await render(ProgressBar, { inputs: { value: 62 } });

    expect(container.querySelector<HTMLElement>('.fill')!.style.width).toBe('62%');
  });

  it('rounds a fractional percentage', async () => {
    await render(ProgressBar, { inputs: { value: 61.6 } });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
  });

  it('clamps a negative value to zero', async () => {
    await render(ProgressBar, { inputs: { value: -5 } });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps a value above the scale to a hundred', async () => {
    await render(ProgressBar, { inputs: { value: 140 } });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('accepts a label of its own', async () => {
    await render(ProgressBar, { inputs: { value: 10, label: 'Progresso da série' } });

    expect(screen.getByRole('progressbar', { name: 'Progresso da série' })).toBeInTheDocument();
  });

  it('puts a star at the end of the thread when asked, and only there', async () => {
    const { container, rerender } = await render(ProgressBar, {
      inputs: { value: 40, size: 'thread', star: true },
    });

    expect(container.querySelector<HTMLElement>('.star')!.style.left).toBe('calc(40% - 7px)');

    await rerender({ inputs: { value: 40, size: 'md', star: true } });
    expect(container.querySelector('.star')).toBeNull();
  });
});
