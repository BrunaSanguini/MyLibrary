import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GoalResponse } from '@core/api/goals-api';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { TODAY } from '@core/time/today';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import GoalsPage from './goals-page';

const GOALS: GoalResponse[] = [
  { id: 1, type: 'BOOKS', period: 'YEAR', year: 2026, target: 24, current: 6, percent: 25 },
  {
    id: 2,
    type: 'PAGES',
    period: 'MONTH',
    year: 2026,
    month: 11,
    target: 600,
    current: 150,
    percent: 25,
  },
];

async function open(url = '/metas') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'metas', component: GoalsPage }], withComponentInputBinding()),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
      { provide: TODAY, useValue: () => '2026-11-17' },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

const goalsOf =
  (year: number) => (request: { url: string; params: { get(name: string): string | null } }) =>
    request.url === '/api/v1/goals' && request.params.get('year') === String(year);

/** jsdom has no modal dialogs; the dialog itself is covered in the browser suite. */
function stubModalDialogs(): void {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

describe('GoalsPage', () => {
  it('opens on the current year, the yearly goals apart from the monthly ones', async () => {
    const { harness, http } = await open();
    http.expectOne(goalsOf(2026)).flush(GOALS);
    await harness.fixture.whenStable();

    const yearly = screen.getByRole('region', { name: 'Do ano' });
    const monthly = screen.getByRole('region', { name: 'Por mês' });
    expect(within(yearly).getByRole('heading', { name: 'Livros em 2026' })).toBeInTheDocument();
    expect(
      within(monthly).getByRole('heading', { name: 'Páginas em novembro' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nova meta para 2026' })).toBeInTheDocument();
  });

  it('goes to another year and keeps it in the address', async () => {
    const { harness, http } = await open();
    http.expectOne(goalsOf(2026)).flush(GOALS);
    await harness.fixture.whenStable();

    await userEvent.click(screen.getByRole('button', { name: 'Ver metas de 2025' }));
    await vi.waitFor(() => {
      TestBed.tick();
      http.expectOne(goalsOf(2025)).flush([]);
    });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/metas?ano=2025');
    expect(screen.getByRole('heading', { name: 'Nenhuma meta para 2025' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar para 2026' })).toBeInTheDocument();
  });

  it('opens the year in the address', async () => {
    const { http } = await open('/metas?ano=2024');

    expect(http.expectOne(goalsOf(2024))).toBeDefined();
  });

  it('confirms before deleting a goal, then fetches the goals again', async () => {
    const { harness, http } = await open();
    http.expectOne(goalsOf(2026)).flush(GOALS);
    await harness.fixture.whenStable();

    stubModalDialogs();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir a meta de Livros em 2026' }));
    http.expectNone({ method: 'DELETE', url: '/api/v1/goals/1' });
    const dialog = screen.getByRole('dialog', { name: 'Excluir a meta de Livros em 2026?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir meta' }));

    http
      .expectOne({ method: 'DELETE', url: '/api/v1/goals/1' })
      .flush(null, { status: 204, statusText: 'No Content' });
    await vi.waitFor(() => http.expectOne(goalsOf(2026)).flush([GOALS[1]]));
    await harness.fixture.whenStable();

    expect(screen.queryByRole('heading', { name: 'Livros em 2026' })).not.toBeInTheDocument();
  });

  it('offers to try again when the goals fail to load', async () => {
    const { harness, http } = await open();
    http
      .expectOne(goalsOf(2026))
      .flush(
        { code: 'internal.error', detail: 'Algo deu errado. Tente de novo.' },
        { status: 500, statusText: 'Server Error' },
      );
    await harness.fixture.whenStable();

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
  });
});
