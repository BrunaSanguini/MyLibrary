import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { NOW } from '@core/time/today';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GoalsSettings } from './goals-settings';

const goal = { year: 2026, current: 0, percent: 0, enabled: true };

/** A yearly goal of 12 books and one of pages that is off; nothing for the month or rereads. */
const GOALS = [
  { ...goal, id: 1, type: 'BOOKS', period: 'YEAR', target: 12 },
  { ...goal, id: 2, type: 'PAGES', period: 'YEAR', target: 4000, enabled: false },
];

const STATS = {
  year: 2026,
  month: 11,
  finishedInMonth: 1,
  finishedInYear: 3,
  rereadsInYear: 0,
  pagesInYear: 1240,
  currentStreak: 0,
  longestStreak: 0,
  finishedLast30Days: 1,
  inProgress: 0,
};

async function setup(goals: unknown[] = GOALS) {
  const view = await render(GoalsSettings, {
    providers: [
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
      { provide: NOW, useValue: () => new Date(2026, 10, 19, 12) },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  const list = http.expectOne((request) => request.url === '/api/v1/goals');
  expect(list.request.params.get('year')).toBe('2026');
  list.flush(goals);
  http.expectOne((request) => request.url === '/api/v1/stats/overview').flush(STATS);
  await view.fixture.whenStable();
  return { view, http };
}

const card = (name: string) => screen.getByRole('article', { name });

describe('GoalsSettings', () => {
  it('shows the four goals as they are saved, with today as the computer says', async () => {
    await setup();

    expect(screen.getByText(/hoje é 19 de novembro de 2026/)).toBeInTheDocument();
    expect(within(card('Meta anual')).getByLabelText('Quantos livros no ano')).toHaveValue('12');
    expect(within(card('Meta anual')).queryByRole('switch')).not.toBeInTheDocument();
    expect(within(card('Meta anual')).getByText(/Fica sempre ligada/)).toBeInTheDocument();
    expect(
      within(card('Meta anual')).getByText('Com esta meta: III de XII · 25% concluído'),
    ).toBeInTheDocument();

    expect(within(card('Páginas no ano')).getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(
      within(card('Páginas no ano')).getByText('Meta desligada: não aparece na Home.'),
    ).toBeInTheDocument();
    expect(within(card('Meta de novembro')).getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('turns a goal on with its target and previews it', async () => {
    await setup();

    await userEvent.click(within(card('Páginas no ano')).getByRole('switch'));

    expect(within(card('Páginas no ano')).getByLabelText('Quantas páginas no ano')).toHaveValue(
      '4000',
    );
    expect(
      within(card('Páginas no ano')).getByText('Com esta meta: 1.240 de 4.000 · 31% concluído'),
    ).toBeInTheDocument();
  });

  it('refuses a target that is not a whole number within the limit', async () => {
    const { http } = await setup();

    const field = within(card('Meta anual')).getByLabelText('Quantos livros no ano');
    await userEvent.clear(field);
    await userEvent.type(field, '1000');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar metas' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Use um número inteiro de 1 a 999.');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    http.expectNone((request) => request.method !== 'GET');
  });

  it('saves only what changed: the target of a goal, a goal turned on, and a new one', async () => {
    const { http, view } = await setup();

    const yearly = within(card('Meta anual')).getByLabelText('Quantos livros no ano');
    await userEvent.clear(yearly);
    await userEvent.type(yearly, '20');
    await userEvent.click(within(card('Páginas no ano')).getByRole('switch'));
    await userEvent.click(within(card('Meta de novembro')).getByRole('switch'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar metas' }));

    const first = http.expectOne({ method: 'PUT', url: '/api/v1/goals/1' });
    expect(first.request.body).toEqual({ target: 20, enabled: true });
    first.flush({ ...GOALS[0], target: 20 });
    await vi.waitFor(() => {
      const pages = http.expectOne({ method: 'PUT', url: '/api/v1/goals/2' });
      expect(pages.request.body).toEqual({ target: 4000, enabled: true });
      pages.flush({ ...GOALS[1], enabled: true });
    });
    await vi.waitFor(() => {
      const month = http.expectOne({ method: 'POST', url: '/api/v1/goals' });
      expect(month.request.body).toEqual({
        type: 'BOOKS',
        period: 'MONTH',
        year: 2026,
        month: 11,
        target: 2,
      });
      month.flush({});
    });
    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Metas salvas. A Home já mostra os novos valores.',
      ),
    );
    http.expectOne((request) => request.url === '/api/v1/goals').flush(GOALS);
    await view.fixture.whenStable();
  });

  it('turns a saved goal off, keeping its target', async () => {
    const { http } = await setup([
      ...GOALS,
      { ...goal, id: 3, type: 'REREADS', period: 'YEAR', target: 3 },
    ]);

    await userEvent.click(within(card('Releituras')).getByRole('switch'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar metas' }));

    expect(http.expectOne({ method: 'PUT', url: '/api/v1/goals/3' }).request.body).toEqual({
      target: 3,
      enabled: false,
    });
  });

  it('tells there are changes and throws them away', async () => {
    await setup();

    await userEvent.click(within(card('Releituras')).getByRole('switch'));
    expect(screen.getByRole('button', { name: 'Descartar alterações' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Descartar alterações' }));

    expect(within(card('Releituras')).getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Alterações descartadas.');
    expect(screen.getByRole('button', { name: 'Descartar alterações' })).toBeDisabled();
  });
});
