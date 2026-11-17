import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GoalForm } from './goal-form';

const GOALS = '/api/v1/goals';

async function setup() {
  const saved = vi.fn();
  const view = await render(GoalForm, {
    inputs: { year: 2026, currentMonth: 11 },
    on: { saved },
    providers: [
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return { view, saved, http: TestBed.inject(HttpTestingController) };
}

const create = () => userEvent.click(screen.getByRole('button', { name: 'Criar meta' }));

describe('GoalForm', () => {
  it('creates a yearly goal of books for the year of the page', async () => {
    const { http, saved, view } = await setup();

    await userEvent.type(screen.getByLabelText('Quantos livros?'), '24');
    await create();

    const request = http.expectOne({ method: 'POST', url: GOALS });
    expect(JSON.parse(JSON.stringify(request.request.body))).toEqual({
      type: 'BOOKS',
      period: 'YEAR',
      year: 2026,
      target: 24,
    });
    request.flush({
      id: 1,
      type: 'BOOKS',
      period: 'YEAR',
      year: 2026,
      target: 24,
      current: 0,
      percent: 0,
    });
    await view.fixture.whenStable();

    await vi.waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Meta criada.'));
    expect(screen.getByLabelText('Quantos livros?')).toHaveValue(null);
  });

  it('creates a monthly goal starting on the current month', async () => {
    const { http } = await setup();

    await userEvent.selectOptions(screen.getByLabelText('O que contar'), 'PAGES');
    await userEvent.click(screen.getByRole('radio', { name: 'Um mês' }));
    expect(screen.getByLabelText('Mês')).toHaveDisplayValue('novembro');
    await userEvent.selectOptions(screen.getByLabelText('Mês'), 'março');
    await userEvent.type(screen.getByLabelText('Quantas páginas?'), '600');
    await create();

    expect(http.expectOne({ method: 'POST', url: GOALS }).request.body).toMatchObject({
      type: 'PAGES',
      period: 'MONTH',
      month: 3,
      target: 600,
    });
  });

  it('only offers the whole year for rereads', async () => {
    const { http } = await setup();

    await userEvent.click(screen.getByRole('radio', { name: 'Um mês' }));
    await userEvent.selectOptions(screen.getByLabelText('O que contar'), 'REREADS');

    expect(screen.queryByRole('radio', { name: 'Um mês' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Mês')).not.toBeInTheDocument();
    expect(screen.getByText('As releituras são contadas pelo ano inteiro.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Quantas releituras?'), '2');
    await create();
    expect(http.expectOne({ method: 'POST', url: GOALS }).request.body).toMatchObject({
      type: 'REREADS',
      period: 'YEAR',
    });
  });

  it('asks for the target before sending', async () => {
    const { http } = await setup();

    await create();

    expect(screen.getByText('Informe o número da meta.')).toBeInTheDocument();
    http.expectNone(GOALS);
  });

  it('shows what the server says about a goal that already exists', async () => {
    const { http, view } = await setup();

    await userEvent.type(screen.getByLabelText('Quantos livros?'), '24');
    await create();
    http
      .expectOne({ method: 'POST', url: GOALS })
      .flush(
        { code: 'goal.duplicated', detail: 'Já existe uma meta deste tipo para este período.' },
        { status: 409, statusText: 'Conflict' },
      );
    await view.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Já existe uma meta deste tipo'),
    );
  });
});
