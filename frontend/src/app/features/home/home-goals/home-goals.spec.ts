import { provideRouter } from '@angular/router';
import { GoalResponse } from '@core/api/goals-api';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { HomeGoals, remainingOf } from './home-goals';

const BOOKS: GoalResponse = {
  id: 1,
  type: 'BOOKS',
  period: 'YEAR',
  year: 2026,
  target: 12,
  current: 3,
  percent: 25,
  enabled: true,
};
const PAGES: GoalResponse = {
  id: 2,
  type: 'PAGES',
  period: 'YEAR',
  year: 2026,
  target: 4000,
  current: 1240,
  percent: 31,
  enabled: true,
};
const MONTH: GoalResponse = {
  id: 3,
  type: 'BOOKS',
  period: 'MONTH',
  year: 2026,
  month: 11,
  target: 2,
  current: 1,
  percent: 50,
  enabled: true,
};

describe('HomeGoals', () => {
  it('puts the yearly goal of books in the ring and the others beside it', async () => {
    await render(HomeGoals, {
      inputs: { goals: [PAGES, MONTH, BOOKS], year: 2026 },
      providers: [provideRouter([])],
    });

    const main = screen.getByRole('article', { name: 'Livros em 2026' });
    expect(main).toHaveTextContent('3 de 12 livros');
    expect(main).toHaveTextContent('Faltam 9 livros para fechar a meta.');
    expect(screen.getByRole('article', { name: 'Páginas em 2026' })).toHaveTextContent(
      '31% concluído',
    );
    expect(screen.getByRole('article', { name: 'Livros em novembro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Gerenciar metas/ })).toHaveAttribute(
      'href',
      '/configuracoes?aba=metas',
    );
  });

  it('invites to create a goal when the year has none', async () => {
    await render(HomeGoals, { inputs: { goals: [], year: 2026 }, providers: [provideRouter([])] });

    expect(screen.getByText(/Nenhuma meta para 2026/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Criar uma meta/ })).toHaveAttribute(
      'href',
      '/configuracoes?aba=metas',
    );
  });

  it('says what is left, or that the goal was reached', () => {
    expect(remainingOf({ ...BOOKS, current: 11 })).toBe('Falta 1 livro para fechar a meta.');
    expect(remainingOf({ ...PAGES, current: 1500, target: 2750 })).toBe(
      'Faltam 1.250 páginas para fechar a meta.',
    );
    expect(remainingOf({ ...BOOKS, current: 12 })).toBe('Meta de 2026 alcançada.');
  });
});
