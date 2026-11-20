import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ListsPage from './lists-page';

@Component({ template: '' })
class ListStub {}

const LISTS = {
  content: [
    {
      id: 4,
      name: 'Para as férias',
      description: 'Leituras leves',
      bookCount: 4,
      readCount: 1,
      wishlistCount: 0,
      status: 'IN_PROGRESS',
      color: 'PLUM',
      pinned: false,
      coverUrls: ['/api/v1/images/a.webp'],
      updatedAt: '2026-11-01T12:00:00Z',
    },
    {
      id: 5,
      name: 'Clássicos',
      bookCount: 0,
      readCount: 0,
      wishlistCount: 0,
      status: 'NOT_STARTED',
      color: 'PLUM',
      pinned: false,
      coverUrls: [],
      updatedAt: '2026-11-01T12:00:00Z',
    },
  ],
  page: 0,
  size: 24,
  totalElements: 2,
  totalPages: 1,
};

async function open() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'listas', component: ListsPage },
          { path: 'lista/:id', component: ListStub },
        ],
        withComponentInputBinding(),
      ),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/listas');
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

describe('ListsPage', () => {
  it('shows each list with how much of it was read', async () => {
    const { harness, http } = await open();
    http.expectOne((request) => request.url === '/api/v1/lists').flush(LISTS);
    await harness.fixture.whenStable();

    expect(screen.getByRole('link', { name: 'Para as férias' })).toHaveAttribute(
      'href',
      '/lista/4',
    );
    expect(screen.getByText('Leituras leves')).toBeInTheDocument();
    expect(screen.getByText('1 lido de 4')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Livros lidos de Para as férias' }),
    ).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('Nenhum livro ainda')).toBeInTheDocument();
  });

  it('invites to create the first list', async () => {
    const { harness, http } = await open();
    http
      .expectOne((request) => request.url === '/api/v1/lists')
      .flush({ ...LISTS, content: [], totalElements: 0 });
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Nenhuma lista ainda' })).toBeInTheDocument();
  });

  it('opens a list right after creating it', async () => {
    const { harness, http } = await open();
    http.expectOne((request) => request.url === '/api/v1/lists').flush(LISTS);
    await harness.fixture.whenStable();

    await userEvent.type(screen.getByLabelText('Nome'), 'Para o inverno');
    await userEvent.click(screen.getByRole('button', { name: 'Criar lista' }));
    http.expectOne({ method: 'POST', url: '/api/v1/lists' }).flush({ ...LISTS.content[1], id: 9 });
    await harness.fixture.whenStable();

    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/lista/9'));
  });
});
