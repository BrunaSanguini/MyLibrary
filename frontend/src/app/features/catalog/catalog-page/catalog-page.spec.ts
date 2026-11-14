import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import CatalogPage from './catalog-page';

const TREE = [
  {
    id: 1,
    name: 'Romance',
    bookCount: 5,
    subgenres: [{ id: 2, name: 'Realismo', bookCount: 3 }],
  },
  { id: 3, name: 'Sátira', bookCount: 1, subgenres: [] },
];

const AUTHORS = {
  content: [
    { id: 7, name: 'Machado de Assis', bookCount: 3, coverUrls: ['/api/v1/images/17'] },
    { id: 8, name: 'Lima Barreto', bookCount: 1, coverUrls: [] },
  ],
  page: 0,
  size: 24,
  totalElements: 2,
  totalPages: 1,
};

async function open(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'catalogos', component: CatalogPage }], withComponentInputBinding()),
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

describe('CatalogPage', () => {
  it('opens on genres, with each genre, its count and its subgenres', async () => {
    const { harness, http } = await open('/catalogos');
    http.expectOne('/api/v1/genres').flush(TREE);
    await harness.fixture.whenStable();

    expect(screen.getByRole('link', { name: 'Romance' })).toHaveAttribute('href', '/generos/1');
    expect(screen.getByText('5 livros')).toBeInTheDocument();
    expect(screen.getByText('1 livro')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Realismo/ })).toHaveAttribute('href', '/generos/2');
  });

  it('marks the open tab for assistive technology', async () => {
    const { harness, http } = await open('/catalogos?tipo=autores');
    http.expectOne((request) => request.url === '/api/v1/authors').flush(AUTHORS);
    await harness.fixture.whenStable();

    const tabs = screen.getByRole('navigation', { name: 'Tipos de catálogo' });
    expect(tabs).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Autores' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Gêneros' })).not.toHaveAttribute('aria-current');
  });

  it('keeps each tab in the address, so it can be linked to', async () => {
    const { harness, http } = await open('/catalogos');
    http.expectOne('/api/v1/genres').flush(TREE);
    await harness.fixture.whenStable();

    expect(screen.getByRole('link', { name: 'Editoras' })).toHaveAttribute(
      'href',
      '/catalogos?tipo=editoras',
    );
    expect(screen.getByRole('link', { name: 'Séries' })).toHaveAttribute(
      'href',
      '/catalogos?tipo=series',
    );
  });

  it('lists authors with their book count, linking to the page of each', async () => {
    const { harness, http } = await open('/catalogos?tipo=autores');
    http.expectOne((request) => request.url === '/api/v1/authors').flush(AUTHORS);
    await harness.fixture.whenStable();

    expect(screen.getByRole('link', { name: 'Machado de Assis' })).toHaveAttribute(
      'href',
      '/autores/7',
    );
    expect(screen.getByText('3 livros')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lima Barreto' })).toHaveAttribute(
      'href',
      '/autores/8',
    );
  });

  it('asks the right catalog for each tab', async () => {
    const { http } = await open('/catalogos?tipo=series&page=2');

    const request = http.expectOne((candidate) => candidate.url === '/api/v1/series');

    expect(request.request.params.get('page')).toBe('2');
  });

  it('falls back to genres for a tab that does not exist', async () => {
    const { http } = await open('/catalogos?tipo=listas');

    expect(http.expectOne('/api/v1/genres')).toBeDefined();
  });

  it('says when a catalog is still empty', async () => {
    const { harness, http } = await open('/catalogos?tipo=editoras');
    http
      .expectOne((request) => request.url === '/api/v1/publishers')
      .flush({ ...AUTHORS, content: [], totalElements: 0 });
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Nada em editoras ainda' })).toBeInTheDocument();
  });

  it('offers to try again when the catalog fails to load', async () => {
    const { harness, http } = await open('/catalogos');
    http
      .expectOne('/api/v1/genres')
      .flush(
        { code: 'internal.error', detail: 'Algo deu errado. Tente de novo.' },
        { status: 500, statusText: 'Server Error' },
      );
    await harness.fixture.whenStable();

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado. Tente de novo.');
  });
});
