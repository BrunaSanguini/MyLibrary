import { provideRouter } from '@angular/router';
import { DeadlineGoalResponse, GoalResponse } from '@core/api/goals-api';
import { TODAY } from '@core/time/today';
import { render, screen, within } from '@testing-library/angular';
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

const NON_FICTION: DeadlineGoalResponse = {
  id: 7,
  type: 'BOOKS',
  target: 2,
  startDate: '2026-08-11',
  endDate: '2027-02-11',
  genre: { id: 12, name: 'Não ficção' },
  current: 1,
  percent: 50,
};

describe('HomeGoals', () => {
  it('puts the yearly goal of books in the ring and the others beside it', async () => {
    await render(HomeGoals, {
      inputs: { goals: [PAGES, MONTH, BOOKS], year: 2026 },
      providers: [provideRouter([])],
    });

    const main = screen.getByRole('article', { name: 'Meta anual' });
    expect(main).toHaveTextContent('3/12 livros');
    expect(main).toHaveTextContent('Faltam 9 livros para fechar a meta de 2026.');
    expect(main).toHaveTextContent('25% concluído');
    expect(main.querySelector('.ring-current')).toHaveTextContent('III');
    expect(main.querySelector('.ring-target')).toHaveTextContent('de XII');
    expect(screen.getByRole('progressbar', { name: 'Progresso da meta anual' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
    const pages = screen.getByRole('article', { name: 'Páginas no ano' });
    expect(pages).toHaveTextContent('31% concluído');
    expect(screen.getByRole('article', { name: 'Meta de novembro' })).toHaveTextContent(
      '/ 2 livros',
    );
    expect(screen.getByText(/Metas de MMXXVI/)).toBeInTheDocument();
    // The ring first, then pages, then the month, whatever the order the API sends.
    expect(
      screen.getAllByRole('article').map((article) => article.getAttribute('aria-label')),
    ).toEqual(['Meta anual', 'Páginas no ano', 'Meta de novembro']);
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

  it('shows the goals with a deadline under the goals of the year', async () => {
    await render(HomeGoals, {
      inputs: { goals: [BOOKS], year: 2026, deadlines: [NON_FICTION] },
      providers: [provideRouter([]), { provide: TODAY, useValue: () => '2026-11-26' }],
    });

    const deadlines = screen.getByRole('list', { name: 'Metas com prazo' });
    expect(
      within(deadlines).getByRole('heading', { name: '2 livros de Não ficção' }),
    ).toBeInTheDocument();
    expect(within(deadlines).getByText('1 de 2 livros')).toBeInTheDocument();
    expect(within(deadlines).getByText('Faltam 77 dias · até 11 de fev.')).toBeInTheDocument();
    expect(
      within(deadlines).getByRole('progressbar', { name: 'Progresso de 2 livros de Não ficção' }),
    ).toHaveAttribute('aria-valuenow', '50');
  });

  it('does not invite to create a goal when there is one with a deadline running', async () => {
    await render(HomeGoals, {
      inputs: { goals: [], year: 2026, deadlines: [NON_FICTION] },
      providers: [provideRouter([]), { provide: TODAY, useValue: () => '2026-11-26' }],
    });

    expect(screen.queryByText(/Nenhuma meta para 2026/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2 livros de Não ficção' })).toBeInTheDocument();
  });

  it('says what is left, or that the goal was reached', () => {
    expect(remainingOf({ ...BOOKS, current: 11 })).toBe(
      'Falta 1 livro para fechar a meta de 2026.',
    );
    expect(remainingOf({ ...PAGES, current: 1500, target: 2750 })).toBe(
      'Faltam 1.250 páginas para fechar a meta de 2026.',
    );
    expect(remainingOf({ ...BOOKS, current: 12 })).toBe('Meta de 2026 cumprida ✦');
  });
});
