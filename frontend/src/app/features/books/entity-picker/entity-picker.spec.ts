import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityPicker, PickerSource } from './entity-picker';

const AUTHORS = {
  content: [
    { id: 7, name: 'J. R. R. Tolkien', bookCount: 2, coverUrls: [] },
    { id: 9, name: 'Machado de Assis', bookCount: 3, coverUrls: [] },
  ],
};

async function renderPicker(source: PickerSource = 'authors', exclude: number[] = []) {
  const picked = vi.fn();
  const result = await render(EntityPicker, {
    inputs: { source, label: 'Autor', exclude },
    on: { picked },
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { ...result, picked, http: TestBed.inject(HttpTestingController) };
}

/** Lets the typing pause pass and answers the listing the picker asks for. */
async function answer(
  http: HttpTestingController,
  fixture: { whenStable(): Promise<unknown> },
  url: string,
  body: object,
) {
  await vi.advanceTimersByTimeAsync(250);
  TestBed.tick();
  const requests = http.match((request) => request.url === url);
  requests.at(-1)?.flush(body);
  await fixture.whenStable();
}

/** The creation resolves through a promise, which needs a turn before the view catches up. */
async function settle(fixture: { whenStable(): Promise<unknown> }) {
  await vi.advanceTimersByTimeAsync(10);
  await fixture.whenStable();
}

describe('EntityPicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('is a combobox named by its label', async () => {
    await renderPicker();

    expect(screen.getByRole('combobox', { name: 'Autor' })).toBeInTheDocument();
  });

  it('lists what the catalog answers for the typed name', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPicker();

    await user.type(screen.getByRole('combobox', { name: 'Autor' }), 'tol');
    await answer(http, fixture, '/api/v1/authors', AUTHORS);

    expect(screen.getByRole('option', { name: 'J. R. R. Tolkien' })).toBeInTheDocument();
  });

  it('picks an option with the keyboard and clears the field', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture, picked } = await renderPicker();
    const field = screen.getByRole('combobox', { name: 'Autor' });

    await user.type(field, 'a');
    await answer(http, fixture, '/api/v1/authors', AUTHORS);
    // The first option is already active, so Enter takes it and the arrow moves on to the next.
    await user.keyboard('{ArrowDown}{Enter}');
    await fixture.whenStable();

    expect(picked).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, name: 'Machado de Assis' }),
    );
    expect(field).toHaveValue('');
  });

  it('leaves out what was already chosen', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPicker('authors', [7]);

    await user.type(screen.getByRole('combobox', { name: 'Autor' }), 'a');
    await answer(http, fixture, '/api/v1/authors', AUTHORS);

    expect(screen.queryByRole('option', { name: 'J. R. R. Tolkien' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Machado de Assis' })).toBeInTheDocument();
  });

  it('offers to create a name that is not in the catalog', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture, picked } = await renderPicker();

    await user.type(screen.getByRole('combobox', { name: 'Autor' }), 'Clarice Lispector');
    await answer(http, fixture, '/api/v1/authors', { content: [] });
    await user.click(screen.getByRole('option', { name: /Criar/ }));
    TestBed.tick();
    const creation = http.expectOne({ method: 'POST', url: '/api/v1/authors' });
    expect(creation.request.body).toEqual({ name: 'Clarice Lispector' });
    creation.flush({ id: 12, name: 'Clarice Lispector', bookCount: 0, coverUrls: [] });
    await settle(fixture);

    expect(picked).toHaveBeenCalledWith({ id: 12, name: 'Clarice Lispector' });
  });

  it('does not offer to create a name that already exists, whatever the accents', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPicker();

    await user.type(screen.getByRole('combobox', { name: 'Autor' }), 'machado de assis');
    await answer(http, fixture, '/api/v1/authors', AUTHORS);

    expect(screen.queryByRole('option', { name: /Criar/ })).not.toBeInTheDocument();
  });

  it('shows why a creation was refused', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture, picked } = await renderPicker('publishers');

    await user.type(screen.getByRole('combobox', { name: 'Autor' }), 'Garnier');
    await answer(http, fixture, '/api/v1/publishers', { content: [] });
    await user.click(screen.getByRole('option', { name: /Criar/ }));
    TestBed.tick();
    http
      .expectOne({ method: 'POST', url: '/api/v1/publishers' })
      .flush(
        { code: 'publisher.name-duplicated', detail: 'Já existe uma editora com este nome.' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);

    expect(screen.getByRole('alert')).toHaveTextContent('Já existe uma editora com este nome.');
    expect(picked).not.toHaveBeenCalled();
  });

  it('filters the genre tree here, subgenres included', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { http, fixture } = await renderPicker('genres');

    await user.type(screen.getByRole('combobox', { name: 'Autor' }), 'fantasia');
    await answer(http, fixture, '/api/v1/genres', [
      {
        id: 1,
        name: 'Fantasia',
        bookCount: 0,
        subgenres: [{ id: 2, name: 'Alta fantasia', bookCount: 0 }],
      },
      { id: 3, name: 'Sátira', bookCount: 0, subgenres: [] },
    ]);

    expect(screen.getByRole('option', { name: 'Fantasia' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alta fantasia' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Sátira' })).not.toBeInTheDocument();
  });
});
