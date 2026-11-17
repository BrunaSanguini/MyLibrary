import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { WeekStrip } from './week-strip';

describe('WeekStrip', () => {
  it('reads each day of the week aloud with its pages', async () => {
    await render(WeekStrip, {
      inputs: {
        today: '2026-11-18',
        days: [
          { date: '2026-11-16', pages: 25 },
          { date: '2026-11-18', pages: 1 },
        ],
      },
    });

    expect(screen.getByText('2 dias com livro aberto · 26 páginas')).toBeInTheDocument();
    const days = screen.getAllByRole('listitem');
    expect(days).toHaveLength(7);
    expect(days[0]).toHaveTextContent('segunda-feira: 25 páginas');
    expect(days[1]).toHaveTextContent('terça-feira: sem leitura');
    expect(days[2]).toHaveTextContent('quarta-feira: 1 página');
    expect(days[3]).toHaveTextContent('quinta-feira: ainda não chegou');
  });
});
