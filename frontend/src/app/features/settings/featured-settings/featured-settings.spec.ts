import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { FeaturedSettings } from './featured-settings';

const HOBBIT = {
  slot: 1,
  bookId: 7,
  title: 'O Hobbit',
  authors: ['J. R. R. Tolkien'],
  imageUrl: '/api/v1/images/9',
};

const card = (id: number, title: string, ownership = 'OWNED') => ({
  id,
  title,
  authors: ['Autora'],
  status: 'READ',
  genres: [],
  ownership,
  favorite: false,
  reread: false,
});

const LIBRARY = [
  card(7, 'O Hobbit'),
  card(8, 'Duna'),
  card(9, 'O Silmarillion', 'WISHLIST'),
  card(10, 'Fundação'),
];

beforeAll(() => {
  // jsdom has no object URLs; the preview only needs a string.
  URL.createObjectURL ??= () => 'blob:previa';
  URL.revokeObjectURL ??= () => undefined;
});

async function setup(featured: unknown[] = [HOBBIT]) {
  const view = await render(FeaturedSettings, {
    providers: [
      provideHttpClient(withInterceptors([problemDetailsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  http.expectOne('/api/v1/featured').flush(featured);
  http
    .expectOne((request) => request.url === '/api/v1/shelf/books')
    .flush({ content: LIBRARY, page: 0, size: 100, totalElements: 4, totalPages: 1 });
  await view.fixture.whenStable();
  return { view, http };
}

const slots = () => screen.getByRole('list', { name: 'Destaques' });

describe('FeaturedSettings', () => {
  it('shows each featured book over its image, and how the Home looks', async () => {
    await setup();

    const slot = within(slots()).getByRole('listitem');
    expect(within(slot).getByRole('img', { name: 'Imagem do destaque O Hobbit' })).toHaveAttribute(
      'src',
      '/api/v1/images/9',
    );
    expect(slot).toHaveTextContent('Destaque I');
    expect(screen.getByText('1 destaque: a Home não mostra setas.')).toBeInTheDocument();
  });

  it('offers only the books the reader has, without the ones already featured', async () => {
    await setup();

    await userEvent.click(screen.getByRole('button', { name: /Adicionar destaque \(2 de 3\)/ }));

    const choices = screen.getByRole('list', { name: 'Livros da estante' });
    expect(
      within(choices)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([expect.stringContaining('Duna'), expect.stringContaining('Fundação')]);
    expect(screen.getByLabelText('Buscar livro da estante')).toHaveFocus();
  });

  it('asks for the image of a new slot before saving', async () => {
    const { http } = await setup();

    await userEvent.click(screen.getByRole('button', { name: /Adicionar destaque/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Escolher Duna' }));
    expect(
      screen.getByText('2 destaques: a Home mostra as setas ‹ › para trocar de livro.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Falta a imagem deste destaque')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar destaques' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Falta 1 imagem para salvar os destaques.');
    http.expectNone({ method: 'PUT', url: '/api/v1/featured' });
  });

  it('keeps the image of a slot whose book changes, and sends the new images after the slots', async () => {
    const { http, view } = await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Trocar livro do destaque I' }));
    await userEvent.click(screen.getByRole('button', { name: 'Escolher Fundação' }));
    await userEvent.click(screen.getByRole('button', { name: /Adicionar destaque/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Escolher Duna' }));
    const file = new File(['x'], 'vitrine.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Trocar imagem do destaque II'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar destaques' }));

    const replace = http.expectOne({ method: 'PUT', url: '/api/v1/featured' });
    expect(replace.request.body).toEqual({
      slots: [{ bookId: 10, imageFrom: 1 }, { bookId: 8 }],
    });
    replace.flush([]);
    await vi.waitFor(() => {
      const image = http.expectOne({ method: 'PUT', url: '/api/v1/featured/2/image' });
      expect((image.request.body as FormData).get('file')).toBeInstanceOf(File);
      image.flush({});
    });
    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Destaques salvos. A Home agora mostra 2 livros, com setas para trocar.',
      ),
    );
    http.expectOne('/api/v1/featured').flush([]);
    await view.fixture.whenStable();
  });

  it('keeps one slot at least', async () => {
    await setup();

    await userEvent.click(screen.getByRole('button', { name: 'Remover destaque I' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'A Home precisa de pelo menos 1 destaque.',
    );
    expect(within(slots()).getAllByRole('listitem')).toHaveLength(1);
  });

  it('says when the three slots are taken', async () => {
    await setup([
      HOBBIT,
      { ...HOBBIT, slot: 2, bookId: 8, title: 'Duna' },
      { ...HOBBIT, slot: 3, bookId: 10, title: 'Fundação' },
    ]);

    expect(screen.getByText('Você já escolheu os 3 destaques permitidos.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Adicionar destaque/ })).not.toBeInTheDocument();
  });

  it('says the Home shows the favorites while nothing is featured', async () => {
    await setup([]);

    expect(screen.getByText(/Nenhum destaque ainda\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar destaques' })).toBeDisabled();
  });
});
