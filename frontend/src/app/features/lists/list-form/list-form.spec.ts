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

describe('ListForm', () => {
  it('creates a list with the name and description trimmed, then clears itself', async () => {
    const { http, saved, view } = await setup();

    await userEvent.type(screen.getByLabelText('Nome'), '  Para as férias ');
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));

    const request = http.expectOne({ method: 'POST', url: '/api/v1/lists' });
    expect(JSON.parse(JSON.stringify(request.request.body))).toEqual({ name: 'Para as férias' });
    request.flush(VACATION);
    await view.fixture.whenStable();

    await vi.waitFor(() => expect(saved).toHaveBeenCalledWith(VACATION));
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('asks for a name before sending', async () => {
    const { http } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));

    expect(screen.getByText('Dê um nome à lista.')).toBeInTheDocument();
    http.expectNone('/api/v1/lists');
  });

  it('shows what the server says about a name already in use', async () => {
    const { http, view } = await setup();

    await userEvent.type(screen.getByLabelText('Nome'), 'Clássicos');
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
  });

  it('edits an existing list, starting from what it has', async () => {
    const { http, cancelled } = await setup(VACATION);

    expect(screen.getByRole('heading', { name: 'Editar lista' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Para as férias');
    expect(screen.getByLabelText(/Descrição/)).toHaveValue('Leituras leves');

    await userEvent.clear(screen.getByLabelText(/Descrição/));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lista' }));
    expect(
      JSON.parse(
        JSON.stringify(http.expectOne({ method: 'PUT', url: '/api/v1/lists/4' }).request.body),
      ),
    ).toEqual({ name: 'Para as férias' });

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(cancelled).toHaveBeenCalledTimes(1);
  });
});
