import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { fireEvent, render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SessionForm } from './session-form';

const SESSIONS = '/api/v1/readings/9/sessions';

async function setup(inputs: { pagesRead?: number; pageCount?: number } = {}) {
  const saved = vi.fn();
  const view = await render(SessionForm, {
    inputs: {
      readingId: 9,
      pagesRead: inputs.pagesRead ?? 120,
      pageCount: inputs.pageCount ?? 576,
      startDate: '2026-11-01',
      today: '2026-11-08',
    },
    on: { saved },
    providers: [
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return { view, saved, http: TestBed.inject(HttpTestingController) };
}

const amount = () => screen.getByRole('spinbutton');
const save = () => userEvent.click(screen.getByRole('button', { name: 'Salvar sessão' }));
const body = (request: { request: { body: unknown } }) =>
  JSON.parse(JSON.stringify(request.request.body)) as unknown;

describe('SessionForm', () => {
  it('only counts the pages and the note as something to lose', async () => {
    const { view } = await setup();
    const form = view.fixture.componentInstance;

    fireEvent.input(screen.getByLabelText('Dia'), { target: { value: '2026-11-07' } });
    await userEvent.click(screen.getByRole('radio', { name: 'Página atual' }));
    expect(form.hasUnsavedChanges()).toBe(false);

    await userEvent.type(screen.getByLabelText(/Anotação/), 'Capítulo 3.');
    expect(form.hasUnsavedChanges()).toBe(true);
  });

  it('starts on today, in pages read, and says where the reader is', async () => {
    await setup();

    expect(screen.getByLabelText('Dia')).toHaveValue('2026-11-08');
    expect(screen.getByRole('radio', { name: 'Páginas lidas' })).toBeChecked();
    expect(screen.getByLabelText('Páginas lidas neste dia')).toHaveValue(null);
    expect(screen.getByText('Você está na página 120 de 576.')).toBeInTheDocument();
  });

  it('sends the pages of the day and tells the page a session was saved', async () => {
    const { http, saved, view } = await setup();

    await userEvent.type(amount(), '25');
    await userEvent.type(screen.getByLabelText(/Anotação/), '  Conselho de Elrond.  ');
    await save();

    const request = http.expectOne({ method: 'POST', url: SESSIONS });
    expect(body(request)).toEqual({
      date: '2026-11-08',
      pagesRead: 25,
      note: 'Conselho de Elrond.',
    });
    request.flush({ id: 3, date: '2026-11-08', pagesRead: 25 });
    await view.fixture.whenStable();

    await vi.waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('✦ +25 páginas em dom, 8/11'),
    );
  });

  it('clears the amount and the note after saving, ready for the next session', async () => {
    const { http, view } = await setup();

    await userEvent.type(amount(), '25');
    await userEvent.type(screen.getByLabelText(/Anotação/), 'Capítulo 2.');
    await save();
    http
      .expectOne({ method: 'POST', url: SESSIONS })
      .flush({ id: 3, date: '2026-11-08', pagesRead: 25 });
    await view.fixture.whenStable();

    await vi.waitFor(() => expect(amount()).toHaveValue(null));
    expect(screen.getByLabelText(/Anotação/)).toHaveValue('');
    expect(view.fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('sends the page the reader stopped at in the other mode', async () => {
    const { http } = await setup();

    await userEvent.click(screen.getByRole('radio', { name: 'Página atual' }));
    await userEvent.type(screen.getByLabelText('Em que página você parou?'), '145');
    await save();

    expect(body(http.expectOne({ method: 'POST', url: SESSIONS }))).toEqual({
      date: '2026-11-08',
      currentPage: 145,
    });
  });

  it('adds the shortcuts to what is typed', async () => {
    await setup();

    await userEvent.type(amount(), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Somar 10 páginas' }));
    await userEvent.click(screen.getByRole('button', { name: 'Somar 25 páginas' }));

    expect(amount()).toHaveValue(40);
  });

  it('steps one page with − and +, from the current page in the current page mode', async () => {
    await setup();

    await userEvent.click(screen.getByRole('radio', { name: 'Página atual' }));
    expect(screen.queryByRole('button', { name: 'Somar 50 páginas' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar' }));
    expect(amount()).toHaveValue(121);

    await userEvent.click(screen.getByRole('button', { name: 'Diminuir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Diminuir' }));
    expect(amount()).toHaveValue(119);
  });

  it('takes an abandoned reading up again before saving the session', async () => {
    const { http, view } = await setup();
    view.fixture.componentRef.setInput('resumeFirst', true);

    await userEvent.type(amount(), '10');
    await save();

    http
      .expectOne({ method: 'POST', url: '/api/v1/readings/9/resume' })
      .flush({ id: 9, status: 'IN_PROGRESS' });
    await vi.waitFor(() => http.expectOne({ method: 'POST', url: SESSIONS }));
  });

  it('follows the day picked in the week, and tells the week about the day typed', async () => {
    const dayChange = vi.fn();
    const { view } = await setup();
    view.fixture.componentInstance.dayChange.subscribe(dayChange);

    view.fixture.componentRef.setInput('day', '2026-11-05');
    await view.fixture.whenStable();
    expect(screen.getByLabelText('Dia')).toHaveValue('2026-11-05');

    fireEvent.input(screen.getByLabelText('Dia'), { target: { value: '2026-11-03' } });
    fireEvent.change(screen.getByLabelText('Dia'));
    expect(dayChange).toHaveBeenCalledWith('2026-11-03');
  });

  it('never lets a shortcut pass the end of the book', async () => {
    await setup({ pagesRead: 560 });

    await userEvent.click(screen.getByRole('button', { name: 'Somar 50 páginas' }));

    expect(amount()).toHaveValue(16);
  });

  it('asks for the amount before sending anything', async () => {
    const { http } = await setup();

    await save();

    expect(screen.getByText('Informe quantas páginas você leu.')).toBeInTheDocument();
    expect(amount()).toHaveAttribute('aria-describedby', 'erro-paginas');
    http.expectNone({ method: 'POST', url: SESSIONS });
  });

  it('refuses more pages than the book has left', async () => {
    const { http } = await setup({ pagesRead: 500 });

    await userEvent.type(amount(), '77');
    await save();

    expect(screen.getByText('Faltam 76 páginas para o fim do livro.')).toBeInTheDocument();
    http.expectNone({ method: 'POST', url: SESSIONS });
  });

  it('refuses a current page that is not ahead or that the book does not have', async () => {
    await setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Página atual' }));

    await userEvent.type(amount(), '120');
    await userEvent.tab();
    expect(screen.getByText('Você já registrou até a página 120.')).toBeInTheDocument();

    await userEvent.clear(amount());
    await userEvent.type(amount(), '577');
    await userEvent.tab();
    expect(screen.getByText('O livro tem 576 páginas.')).toBeInTheDocument();
  });

  it('refuses a day before the reading started or in the future', async () => {
    await setup();
    const day = screen.getByLabelText('Dia');

    // A date input takes its value whole, as the date picker of the browser sets it.
    fireEvent.input(day, { target: { value: '2026-10-31' } });
    fireEvent.blur(day);
    expect(await screen.findByText('A leitura começou depois desse dia.')).toBeInTheDocument();

    fireEvent.input(day, { target: { value: '2026-11-09' } });
    expect(await screen.findByText('O dia da leitura não pode ser no futuro.')).toBeInTheDocument();
  });

  it('shows at the top what the server refuses, and keeps what was typed', async () => {
    const { http, saved, view } = await setup();

    await userEvent.type(amount(), '25');
    await save();
    http
      .expectOne({ method: 'POST', url: SESSIONS })
      .flush(
        { code: 'session.out-of-period', detail: 'A data da sessão precisa ficar no período.' },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await view.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A data da sessão precisa ficar no período.',
      ),
    );
    expect(amount()).toHaveValue(25);
    expect(saved).not.toHaveBeenCalled();
  });

  it('knows about unsaved changes once something is typed', async () => {
    const { view } = await setup();

    expect(view.fixture.componentInstance.hasUnsavedChanges()).toBe(false);

    await userEvent.type(amount(), '2');

    expect(view.fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });
});
