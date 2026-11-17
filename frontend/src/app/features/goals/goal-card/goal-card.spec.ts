import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GoalResponse } from '@core/api/goals-api';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GoalCard } from './goal-card';

const BOOKS: GoalResponse = {
  id: 5,
  type: 'BOOKS',
  period: 'YEAR',
  year: 2026,
  target: 24,
  current: 6,
  percent: 25,
};

async function setup(goal: GoalResponse = BOOKS) {
  const changed = vi.fn();
  const deleteRequested = vi.fn();
  const view = await render(GoalCard, {
    inputs: { goal },
    on: { changed, deleteRequested },
    providers: [
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return { view, changed, deleteRequested, http: TestBed.inject(HttpTestingController) };
}

describe('GoalCard', () => {
  it('shows what the goal counts and how far it is', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: 'Livros em 2026' })).toBeInTheDocument();
    expect(screen.getByText('6 de 24 livros')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Progresso de Livros em 2026' }),
    ).toHaveAttribute('aria-valuenow', '25');
    expect(screen.queryByText('Meta alcançada')).not.toBeInTheDocument();
  });

  it('celebrates a goal that was reached', async () => {
    await setup({ ...BOOKS, current: 30, percent: 100 });

    expect(screen.getByText('Meta alcançada')).toBeInTheDocument();
  });

  it('changes the target right on the card', async () => {
    const { http, changed, view } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Alterar a meta de Livros em 2026' }));
    const field = screen.getByLabelText('Nova meta');
    expect(field).toHaveValue(24);
    await userEvent.clear(field);
    await userEvent.type(field, '30');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const request = http.expectOne({ method: 'PUT', url: '/api/v1/goals/5' });
    expect(request.request.body).toEqual({ target: 30 });
    request.flush({ ...BOOKS, target: 30, percent: 20 });
    await view.fixture.whenStable();

    await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(screen.queryByLabelText('Nova meta')).not.toBeInTheDocument());
  });

  it('refuses a target that is not a positive whole number', async () => {
    const { http } = await setup();

    await userEvent.click(screen.getByRole('button', { name: /Alterar a meta/ }));
    await userEvent.clear(screen.getByLabelText('Nova meta'));
    await userEvent.type(screen.getByLabelText('Nova meta'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Use um número inteiro maior que zero.');
    http.expectNone('/api/v1/goals/5');
  });

  it('leaves the confirmation of a deletion to the page', async () => {
    const { deleteRequested } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir a meta de Livros em 2026' }));

    expect(deleteRequested).toHaveBeenCalledTimes(1);
  });
});
