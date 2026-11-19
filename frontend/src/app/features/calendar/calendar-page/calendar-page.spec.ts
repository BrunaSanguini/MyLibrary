import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { TODAY } from '@core/time/today';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CalendarPage from './calendar-page';

const entry = (bookId: number, title: string, pages: number, extra: object = {}) => ({
  bookId,
  title,
  authors: ['Patrick Rothfuss'],
  pages,
  started: false,
  finished: false,
  ...extra,
});

const NOVEMBER = {
  year: 2026,
  month: 11,
  finished: 1,
  days: [
    { date: '2026-11-02', books: [entry(1, 'O Nome do Vento', 32)] },
    {
      date: '2026-11-03',
      books: [entry(1, 'O Nome do Vento', 18), entry(2, 'O Olho do Mundo', 24, { started: true })],
    },
    { date: '2026-11-05', books: [entry(1, 'O Nome do Vento', 40, { finished: true })] },
  ],
};

async function open(url = '/calendario') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'calendario', component: CalendarPage }], withComponentInputBinding()),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
      { provide: TODAY, useValue: () => '2026-11-08' },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

async function openNovember() {
  const opened = await open();
  const request = opened.http.expectOne((r) => r.url === '/api/v1/stats/calendar');
  expect(request.request.params.get('year')).toBe('2026');
  expect(request.request.params.get('month')).toBe('11');
  request.flush(NOVEMBER);
  await opened.harness.fixture.whenStable();
  return opened;
}

const day = (name: RegExp | string) => screen.getByRole('button', { name });

describe('CalendarPage', () => {
  it('opens on the current month with its numbers', async () => {
    await openNovember();

    expect(screen.getByRole('heading', { level: 1, name: 'Novembro de 2026' })).toBeInTheDocument();
    const summary = screen.getByRole('list', { name: 'Resumo do mês' });
    expect(summary).toHaveTextContent('3 dias lendo');
    expect(summary).toHaveTextContent('2 livros');
    expect(summary).toHaveTextContent('114 páginas');
    expect(summary).toHaveTextContent('1 terminados');
  });

  it('starts the weeks on Monday and names each day by its books', async () => {
    await openNovember();

    const cells = screen.getAllByRole('button', { name: /de (outubro|novembro|dezembro)/ });
    // 1 November 2026 is a Sunday: the first week starts on 26 October.
    expect(cells[0]).toHaveAccessibleName('26 de outubro');
    expect(day(/^3 de novembro/)).toHaveAccessibleName(
      '3 de novembro: O Nome do Vento, 18 páginas; O Olho do Mundo, 24 páginas Início 42 págs',
    );
    expect(within(day(/^3 de novembro/)).getByText('Início')).toBeInTheDocument();
    expect(within(day(/^5 de novembro/)).getByText('Fim')).toBeInTheDocument();
    expect(day('9 de novembro')).toBeDisabled();
  });

  it('shows the books of a day beside the grid', async () => {
    await openNovember();

    await userEvent.click(day(/^3 de novembro/));

    const details = screen.getByRole('complementary', { name: '3 de novembro' });
    expect(within(details).getByText('terça-feira')).toBeInTheDocument();
    expect(within(details).getByText('Começou')).toBeInTheDocument();
    expect(within(details).getAllByRole('link', { name: /Abrir livro/ })[0]).toHaveAttribute(
      'href',
      '/livro/1',
    );
    await userEvent.click(within(details).getByRole('button', { name: 'Fechar detalhes' }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('dims the days without the highlighted book', async () => {
    await openNovember();

    await userEvent.click(screen.getByRole('button', { name: /O Olho do Mundo 1 dia/ }));

    expect(day(/^2 de novembro/)).toHaveClass('dim');
    expect(day(/^3 de novembro/)).not.toHaveClass('dim');
  });

  it('goes to the previous month through the address', async () => {
    const { http, harness } = await openNovember();

    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/calendario?mes=2026-10'));
    TestBed.tick();
    const request = http.expectOne((r) => r.url === '/api/v1/stats/calendar');
    expect(request.request.params.get('month')).toBe('10');
    request.flush({ year: 2026, month: 10, finished: 0, days: [] });
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { level: 1, name: 'Outubro de 2026' })).toBeInTheDocument();
    expect(screen.getByText('Nenhuma leitura registrada neste mês.')).toBeInTheDocument();
  });
});
