import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { TODAY } from '@core/time/today';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addMonths, DeadlineGoals } from './deadline-goals';

const NON_FICTION = {
  id: 7,
  type: 'BOOKS',
  target: 2,
  startDate: '2026-08-11',
  endDate: '2027-02-11',
  genre: { id: 12, name: 'Não ficção' },
  current: 1,
  percent: 50,
};

const NEXT_YEAR = {
  id: 8,
  type: 'BOOKS',
  target: 20,
  startDate: '2027-01-01',
  endDate: '2027-12-31',
  genre: null,
  current: 0,
  percent: 0,
};

const OVER = {
  id: 9,
  type: 'PAGES',
  target: 3000,
  startDate: '2026-01-01',
  endDate: '2026-06-30',
  genre: null,
  current: 2100,
  percent: 70,
};

const GENRES = [
  {
    id: 12,
    name: 'Não ficção',
    bookCount: 4,
    subgenres: [{ id: 13, name: 'Biografia', bookCount: 2 }],
  },
  { id: 20, name: 'Fantasia', bookCount: 9, subgenres: [] },
];

async function setup(goals: unknown[] = [OVER, NON_FICTION, NEXT_YEAR]) {
  const view = await render(DeadlineGoals, {
    providers: [
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
      { provide: TODAY, useValue: () => '2026-11-26' },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  http.expectOne('/api/v1/goals/deadlines').flush(goals);
  http.expectOne('/api/v1/genres').flush(GENRES);
  await view.fixture.whenStable();
  return { view, http };
}

const goalCards = () =>
  within(screen.getByRole('list', { name: 'Suas metas com prazo' })).getAllByRole('listitem');

describe('DeadlineGoals', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  it('lists the goals running first, then the ones to come and the ones that ended', async () => {
    await setup();

    const [running, upcoming, ended] = goalCards();
    expect(
      within(running!).getByRole('heading', { name: '2 livros de Não ficção' }),
    ).toBeInTheDocument();
    expect(
      within(running!).getByText('11 de agosto de 2026 → 11 de fevereiro de 2027'),
    ).toBeInTheDocument();
    expect(within(running!).getByText('1 de 2 livros')).toBeInTheDocument();
    expect(within(running!).getByText('Faltam 77 dias')).toBeInTheDocument();
    expect(within(running!).getByText('Em andamento')).toBeInTheDocument();
    expect(within(upcoming!).getByRole('heading', { name: '20 livros' })).toBeInTheDocument();
    expect(within(upcoming!).getByText('Começa em 36 dias')).toBeInTheDocument();
    expect(within(ended!).getByText('Encerrada')).toBeInTheDocument();
    expect(within(ended!).getByText('Não cumprida')).toBeInTheDocument();
  });

  it('says when there is no goal with a deadline yet', async () => {
    await setup([]);

    expect(screen.getByText('Nenhuma meta com prazo ainda.')).toBeInTheDocument();
  });

  it('creates a goal of one genre over the next six months', async () => {
    const { http, view } = await setup([]);

    await userEvent.click(screen.getByRole('button', { name: 'Nova meta com prazo' }));
    expect(screen.getByLabelText('Início')).toHaveValue('2026-11-26');
    expect(screen.getByLabelText('Fim')).toHaveValue('2027-05-26');
    await userEvent.type(screen.getByLabelText('Quantidade'), '2');
    await userEvent.selectOptions(screen.getByLabelText('Gênero'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar meta' }));

    const request = http.expectOne({ method: 'POST', url: '/api/v1/goals/deadlines' });
    expect(request.request.body).toEqual({
      type: 'BOOKS',
      target: 2,
      startDate: '2026-11-26',
      endDate: '2027-05-26',
      genreId: 12,
    });
    request.flush({ ...NON_FICTION, id: 10, startDate: '2026-11-26', endDate: '2027-05-26' });
    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne('/api/v1/goals/deadlines').flush([NON_FICTION]);
    });
    await view.fixture.whenStable();

    expect(screen.getByText('Meta com prazo criada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar meta' })).not.toBeInTheDocument();
  });

  it('fills both dates with a shortcut, like the whole of next year', async () => {
    const { http } = await setup([]);

    await userEvent.click(screen.getByRole('button', { name: 'Nova meta com prazo' }));
    await userEvent.type(screen.getByLabelText('Quantidade'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Ano que vem' }));
    expect(screen.getByLabelText('Início')).toHaveValue('2027-01-01');
    expect(screen.getByLabelText('Fim')).toHaveValue('2027-12-31');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar meta' }));

    const request = http.expectOne({ method: 'POST', url: '/api/v1/goals/deadlines' });
    expect(request.request.body).toEqual({
      type: 'BOOKS',
      target: 20,
      startDate: '2027-01-01',
      endDate: '2027-12-31',
    });
  });

  it('refuses an empty amount and an end before the start, without sending anything', async () => {
    const { http } = await setup([]);

    await userEvent.click(screen.getByRole('button', { name: 'Nova meta com prazo' }));
    const end = screen.getByLabelText('Fim');
    await userEvent.clear(end);
    await userEvent.type(end, '2026-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar meta' }));

    expect(screen.getByText('Informe um número inteiro maior que zero.')).toBeInTheDocument();
    expect(
      screen.getByText('A data final precisa ser no mesmo dia ou depois do início.'),
    ).toBeInTheDocument();
    http.expectNone({ method: 'POST', url: '/api/v1/goals/deadlines' });
  });

  it('edits a goal from what is saved and replaces it', async () => {
    const { http } = await setup([NON_FICTION]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Editar a meta 2 livros de Não ficção' }),
    );
    expect(screen.getByLabelText('Quantidade')).toHaveValue('2');
    expect(screen.getByLabelText('Gênero')).toHaveValue('12');
    const amount = screen.getByLabelText('Quantidade');
    await userEvent.clear(amount);
    await userEvent.type(amount, '3');
    await userEvent.selectOptions(screen.getByLabelText('Gênero'), '');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar meta' }));

    const request = http.expectOne({ method: 'PUT', url: '/api/v1/goals/deadlines/7' });
    expect(request.request.body).toEqual({
      type: 'BOOKS',
      target: 3,
      startDate: '2026-08-11',
      endDate: '2027-02-11',
    });
  });

  it('shows why the server refused the goal and keeps the form open', async () => {
    const { http, view } = await setup([]);

    await userEvent.click(screen.getByRole('button', { name: 'Nova meta com prazo' }));
    await userEvent.type(screen.getByLabelText('Quantidade'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar meta' }));
    http.expectOne({ method: 'POST', url: '/api/v1/goals/deadlines' }).flush(
      {
        code: 'genre.not-found',
        title: 'Gênero não encontrado',
        detail: 'O gênero solicitado não existe.',
      },
      { status: 404, statusText: 'Not Found' },
    );
    await view.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByText('O gênero solicitado não existe.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Salvar meta' })).toBeInTheDocument();
  });

  it('asks before deleting a goal, and only deletes once confirmed', async () => {
    const { http, view } = await setup([NON_FICTION]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir a meta 2 livros de Não ficção' }),
    );
    http.expectNone({ method: 'DELETE' });
    await userEvent.click(screen.getByRole('button', { name: 'Excluir meta', hidden: true }));

    http.expectOne({ method: 'DELETE', url: '/api/v1/goals/deadlines/7' }).flush(null);
    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne('/api/v1/goals/deadlines').flush([]);
    });
    await view.fixture.whenStable();

    expect(screen.getByText('Meta com prazo excluída.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma meta com prazo ainda.')).toBeInTheDocument();
  });
});

describe('addMonths', () => {
  it('keeps the day, or takes the last day of a shorter month', () => {
    expect(addMonths('2026-08-11', 6)).toBe('2027-02-11');
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonths('2027-11-30', 3)).toBe('2028-02-29');
  });
});
