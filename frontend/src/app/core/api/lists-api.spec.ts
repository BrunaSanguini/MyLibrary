import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { ListsApi, percentOf, readCountOf, statusLabelOf } from './lists-api';

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
    [0, 0, '0 de 0 lidos'],
    [3, 0, '0 de 3 lidos'],
    [3, 1, '1 de 3 lidos'],
    [5, 2, '2 de 5 lidos'],
  ])('describes %i books with %i read', (bookCount, readCount, text) => {
    expect(readCountOf({ bookCount, readCount })).toBe(text);
  });
});

describe('percentOf', () => {
  it.each([
    [0, 0, 0],
    [8, 5, 63],
    [3, 1, 33],
    [4, 4, 100],
    [2, 3, 100],
  ])('gives %i books with %i read as %i%%', (bookCount, readCount, percent) => {
    expect(percentOf({ bookCount, readCount })).toBe(percent);
  });
});

describe('statusLabelOf', () => {
  it.each([
    ['NOT_STARTED', 'Não iniciada'],
    ['IN_PROGRESS', 'Em andamento'],
    ['COMPLETED', 'Concluída'],
  ] as const)('writes %s as "%s"', (status, label) => {
    expect(statusLabelOf(status)).toBe(label);
  });
});

describe('ListsApi requests', () => {
  function api(): ListsApi {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return TestBed.inject(ListsApi);
  }

  it('asks for the cards by the last change, leaving the pinned list out', () => {
    expect(api().cardsRequest()).toEqual({
      url: '/api/v1/lists',
      params: { pinned: false, page: 0, size: 100, sort: 'updatedAt,desc' },
    });
  });

  it('narrows the cards by status', () => {
    expect(api().cardsRequest({ status: 'COMPLETED' }).params).toMatchObject({
      pinned: false,
      status: 'COMPLETED',
    });
  });

  it('asks for the pinned list alone', () => {
    expect(api().pinnedRequest()).toEqual({
      url: '/api/v1/lists',
      params: { pinned: true, size: 1 },
    });
  });

  it('counts with a page of one card, with or without a status', () => {
    const lists = api();

    expect(lists.countRequest()).toEqual({
      url: '/api/v1/lists',
      params: { pinned: false, size: 1 },
    });
    expect(lists.countRequest('NOT_STARTED').params).toEqual({
      pinned: false,
      status: 'NOT_STARTED',
      size: 1,
    });
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
