import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { ListsApi, readCountOf } from './lists-api';

const card = (id: number) => ({
  id,
  title: `Livro ${id}`,
  authors: [],
  status: 'WANT_TO_READ',
  genres: [],
  ownership: 'OWNED',
  favorite: false,
});

describe('readCountOf', () => {
  it.each([
    [0, 0, 'Nenhum livro ainda'],
    [3, 0, '0 lidos de 3'],
    [3, 1, '1 lido de 3'],
    [5, 2, '2 lidos de 5'],
  ])('describes %i books with %i read', (bookCount, readCount, text) => {
    expect(readCountOf({ bookCount, readCount })).toBe(text);
  });
});

describe('ListsApi.books', () => {
  it('walks every page of the list, in its order', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(ListsApi);
    const http = TestBed.inject(HttpTestingController);

    const books = firstValueFrom(api.books(4));
    const first = http.expectOne((request) => request.params.get('page') === '0');
    expect(first.request.params.get('listId')).toBe('4');
    expect(first.request.params.get('sort')).toBe('listOrder,asc');
    first.flush({ content: [card(1), card(2)], page: 0, size: 2, totalElements: 3, totalPages: 2 });
    http
      .expectOne((request) => request.params.get('page') === '1')
      .flush({ content: [card(3)], page: 1, size: 2, totalElements: 3, totalPages: 2 });

    expect((await books).map(({ id }) => id)).toEqual([1, 2, 3]);
    http.verify();
  });
});
