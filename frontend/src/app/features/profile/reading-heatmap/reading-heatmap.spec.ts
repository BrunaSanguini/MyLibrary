import { render, screen, within } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { ReadingHeatmap } from './reading-heatmap';

describe('ReadingHeatmap', () => {
  it('gives screen readers a table of the months instead of the squares', async () => {
    const { container } = await render(ReadingHeatmap, {
      inputs: {
        today: '2026-11-17',
        days: [
          { date: '2026-10-30', pages: 5 },
          { date: '2026-11-02', pages: 1200 },
          { date: '2026-11-03', pages: 20 },
        ],
        longestStreak: 2,
      },
    });

    expect(
      screen.getByText('3 dias com livro aberto · maior sequência de 2 dias'),
    ).toBeInTheDocument();
    expect(container.querySelector('.grid')).toHaveAttribute('aria-hidden', 'true');
    const table = screen.getByRole('table', { name: 'Dias com leitura nos últimos seis meses' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('outubro15');
    expect(rows[2]).toHaveTextContent('novembro21.220');
  });

  it('says so when there is no reading', async () => {
    await render(ReadingHeatmap, { inputs: { today: '2026-11-17', days: [], longestStreak: 0 } });

    expect(
      screen.getByRole('cell', { name: 'Nenhum dia com leitura registrado.' }),
    ).toBeInTheDocument();
  });
});
