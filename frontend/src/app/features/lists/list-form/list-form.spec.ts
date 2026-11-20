import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BookListResponse } from '@core/api/lists-api';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ListForm } from './list-form';

const VACATION: BookListResponse = {
  id: 4,
  name: 'Para as férias',
  description: 'Leituras leves',
  bookCount: 2,
  readCount: 1,
  wishlistCount: 0,
  status: 'IN_PROGRESS',
  color: 'PLUM',
  pinned: false,
  coverUrls: [],
  updatedAt: '2026-11-01T12:00:00Z',
};

async function setup(list?: BookListResponse) {
  const saved = vi.fn();
  const cancelled = vi.fn();
  const view = await render(ListForm, {
    inputs: list ? { list } : {},
    on: { saved, cancelled },
    providers: [
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return { view, saved, cancelled, http: TestBed.inject(HttpTestingController) };
}

function bodyOf(request: { request: { body: unknown } }): unknown {
  return JSON.parse(JSON.stringify(request.request.body));
}

describe('ListForm', () => {
  it('puts the cursor in the name as soon as it opens', async () => {
    await setup();

    expect(screen.getByLabelText('Nome da lista')).toHaveFocus();
  });

  it('creates a list with the name trimmed and the plum cover, then clears itself', async () => {
    const { http, saved, view } = await setup();

    await userEvent.type(screen.getByLabelText('Nome da lista'), '  Para as férias ');
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));

    const request = http.expectOne({ method: 'POST', url: '/api/v1/lists' });
    expect(bodyOf(request)).toEqual({ name: 'Para as férias', color: 'PLUM' });
    request.flush(VACATION);
    await view.fixture.whenStable();

    await vi.waitFor(() => expect(saved).toHaveBeenCalledWith(VACATION));
    expect(screen.getByLabelText('Nome da lista')).toHaveValue('');
  });

  it('sends the description and the colour that was chosen, and goes back to plum afterwards', async () => {
    const { http, view } = await setup();

    await userEvent.type(screen.getByLabelText('Nome da lista'), 'Lidos no inverno');
    await userEvent.type(screen.getByLabelText(/Descrição/), 'Para o frio ');
    await userEvent.click(screen.getByRole('radio', { name: 'Ferrugem' }));
    expect(screen.getByRole('radio', { name: 'Ferrugem' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Ameixa' })).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));

    const request = http.expectOne({ method: 'POST', url: '/api/v1/lists' });
    expect(bodyOf(request)).toEqual({
      name: 'Lidos no inverno',
      description: 'Para o frio',
      color: 'RUST',
    });
    request.flush({ ...VACATION, color: 'RUST' });
    await view.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Ameixa' })).toHaveAttribute('aria-checked', 'true'),
    );
  });

  it('offers the six covers as one group the arrows walk through', async () => {
    await setup();

    expect(screen.getByRole('radiogroup', { name: 'Cor da capa da lista' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'Verde floresta',
      'Ameixa',
      'Azul noite',
      'Ferrugem',
      'Lacre',
      'Musgo',
    ]);

    screen.getByRole('radio', { name: 'Ameixa' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Azul noite' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Azul noite' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Musgo' })).toHaveAttribute('aria-checked', 'true');
  });

  it.each(['', '   '])('asks for a name before sending (%j)', async (typed) => {
    const { http } = await setup();

    if (typed) {
      await userEvent.type(screen.getByLabelText('Nome da lista'), typed);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Dê um nome à lista.');
    http.expectNone('/api/v1/lists');
  });

  it('refuses a name of more than 60 characters and a description of more than 140', async () => {
    const { http } = await setup();

    await userEvent.type(screen.getByLabelText('Nome da lista'), 'n'.repeat(61));
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));
    expect(screen.getByRole('alert')).toHaveTextContent('O nome tem no máximo 60 caracteres.');

    await userEvent.clear(screen.getByLabelText('Nome da lista'));
    await userEvent.type(screen.getByLabelText('Nome da lista'), 'n'.repeat(60));
    await userEvent.type(screen.getByLabelText(/Descrição/), 'd'.repeat(141));
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A descrição tem no máximo 140 caracteres.',
    );
    http.expectNone('/api/v1/lists');
  });

  it('shows what the server says about a name already in use, until the name changes', async () => {
    const { http, view } = await setup();

    await userEvent.type(screen.getByLabelText('Nome da lista'), 'Clássicos');
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));
    http
      .expectOne({ method: 'POST', url: '/api/v1/lists' })
      .flush(
        { code: 'list.name-duplicated', detail: 'Já existe uma lista com este nome.' },
        { status: 409, statusText: 'Conflict' },
      );
    await view.fixture.whenStable();

    await vi.waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Já existe uma lista com este nome.'),
    );
    expect(screen.getByLabelText('Nome da lista')).toHaveAttribute(
      'aria-describedby',
      'erro-lista',
    );

    await userEvent.type(screen.getByLabelText('Nome da lista'), ' 2');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('edits an existing list, starting from what it has', async () => {
    const { http, cancelled } = await setup({ ...VACATION, color: 'MOSS' });

    expect(screen.getByRole('form', { name: 'Editar lista' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome da lista')).toHaveValue('Para as férias');
    expect(screen.getByLabelText(/Descrição/)).toHaveValue('Leituras leves');
    expect(screen.getByRole('radio', { name: 'Musgo' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.clear(screen.getByLabelText(/Descrição/));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lista' }));
    expect(bodyOf(http.expectOne({ method: 'PUT', url: '/api/v1/lists/4' }))).toEqual({
      name: 'Para as férias',
      color: 'MOSS',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape without saving', async () => {
    const { http, cancelled } = await setup();

    await userEvent.type(screen.getByLabelText('Nome da lista'), 'Rascunho');
    await userEvent.keyboard('{Escape}');

    expect(cancelled).toHaveBeenCalledTimes(1);
    http.expectNone('/api/v1/lists');
  });
});
