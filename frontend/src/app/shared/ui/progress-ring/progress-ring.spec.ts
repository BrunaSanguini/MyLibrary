import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { ProgressRing } from './progress-ring';

describe('ProgressRing', () => {
  it('is a progressbar with the value and a name', async () => {
    await render(ProgressRing, { inputs: { value: 20 } });

    const ring = screen.getByRole('progressbar', { name: 'Progresso de leitura' });
    expect(ring).toHaveAttribute('aria-valuenow', '20');
    expect(ring).toHaveTextContent('20%');
  });

  it.each([
    [140, '100'],
    [-5, '0'],
    [33.6, '34'],
  ])('keeps the value between 0 and 100 and rounds it: %s becomes %s', async (value, shown) => {
    await render(ProgressRing, { inputs: { value } });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', shown);
  });

  it.each([
    [0, 1],
    [100, 0],
  ])('draws the stroke for %s%%', async (value, emptyShare) => {
    const view = await render(ProgressRing, { inputs: { value } });
    const fill = view.container.querySelector('.fill')!;
    const length = Number(fill.getAttribute('stroke-dasharray'));

    expect(Number(fill.getAttribute('stroke-dashoffset'))).toBeCloseTo(length * emptyShare);
  });

  it('accepts a name that says what is being measured', async () => {
    await render(ProgressRing, { inputs: { value: 50, label: 'Progresso de Duna' } });

    expect(screen.getByRole('progressbar', { name: 'Progresso de Duna' })).toBeInTheDocument();
  });
});
