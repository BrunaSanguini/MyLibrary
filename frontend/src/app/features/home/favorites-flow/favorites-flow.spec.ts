import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookCardResponse } from '@core/api/shelf-api';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FavoritesFlow, FLOW_INTERVAL } from './favorites-flow';

const card = (id: number, title: string): BookCardResponse => ({
  id,
  title,
  authors: ['Autora'],
  status: 'READ',
  genres: [],
  ownership: 'OWNED',
  favorite: true,
  rating: id === 1 ? 5 : undefined,
});

const BOOKS = [
  card(1, 'Um'),
  card(2, 'Dois'),
  card(3, 'Três'),
  card(4, 'Quatro'),
  card(5, 'Cinco'),
  card(6, 'Seis'),
];

function mockMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes('reduce'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

async function setup() {
  const view = await render(FavoritesFlow, {
    inputs: { books: BOOKS },
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  TestBed.inject(HttpTestingController).match(() => true);
  return view;
}

const centered = () => screen.getByRole('button', { name: /\(no centro\)/ });

describe('FavoritesFlow', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('puts the first favorite in the middle and hides the far ones', async () => {
    mockMotion(true);
    const view = await setup();

    expect(centered()).toHaveAccessibleName('Um, de Autora, nota 5,0 (no centro)');
    expect(screen.getByText('★ 5,0')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Trazer Dois, de Autora para o centro' }),
    ).toBeInTheDocument();
    // Three steps away, past the edge of the stage.
    const hidden = view.container.querySelectorAll('.item[aria-hidden="true"]');
    expect(hidden).toHaveLength(1);
    expect(hidden[0]).toHaveTextContent('Trazer Quatro, de Autora para o centro');
    expect(hidden[0]).toHaveAttribute('tabindex', '-1');
    expect(screen.getByText('01 / 06')).toBeInTheDocument();
  });

  it('brings a side book to the middle when it is clicked', async () => {
    mockMotion(true);
    await setup();

    await userEvent.click(
      screen.getByRole('button', { name: 'Trazer Seis, de Autora para o centro' }),
    );

    expect(centered()).toHaveAccessibleName('Seis, de Autora (no centro)');
    expect(screen.getByText('06 / 06')).toBeInTheDocument();
  });

  it('moves on by itself and stops when paused', async () => {
    mockMotion(false);
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await setup();

    vi.advanceTimersByTime(FLOW_INTERVAL);
    TestBed.tick();
    expect(centered()).toHaveAccessibleName('Dois, de Autora (no centro)');

    screen.getByRole('button', { name: 'Pausar a passagem dos favoritos' }).click();
    // The focus was not inside: the click alone pauses it.
    TestBed.tick();
    vi.advanceTimersByTime(FLOW_INTERVAL * 2);
    TestBed.tick();
    expect(centered()).toHaveAccessibleName('Dois, de Autora (no centro)');
    expect(
      screen.getByRole('button', { name: 'Retomar a passagem dos favoritos' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts paused when the system asks for less motion', async () => {
    mockMotion(true);
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await setup();

    vi.advanceTimersByTime(FLOW_INTERVAL * 2);
    TestBed.tick();

    expect(centered()).toHaveAccessibleName('Um, de Autora, nota 5,0 (no centro)');
    expect(
      screen.getByRole('button', { name: 'Retomar a passagem dos favoritos' }),
    ).toBeInTheDocument();
  });
});
