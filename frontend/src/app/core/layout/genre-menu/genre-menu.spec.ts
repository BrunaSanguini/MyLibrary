import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { GenreMenu } from './genre-menu';

const TREE = [
  { id: 1, name: 'Fantasia', subgenres: [{ id: 2, name: 'Alta fantasia' }] },
  { id: 3, name: 'Ficção científica', subgenres: [] },
];

async function renderMenu() {
  const result = await render(GenreMenu, {
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  return { ...result, http: TestBed.inject(HttpTestingController) };
}

/**
 * Answers the tree request. The tick lets the resource fire it: awaiting stability first would
 * hang, since a pending request never settles on its own.
 */
async function answerTree(
  http: HttpTestingController,
  fixture: { whenStable(): Promise<unknown> },
  tree: object = TREE,
) {
  TestBed.tick();
  http.expectOne('/api/v1/genres').flush(tree);
  await fixture.whenStable();
}

describe('GenreMenu', () => {
  it('starts closed and says so', async () => {
    await renderMenu();

    expect(screen.getByRole('button', { name: /Gêneros/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('only asks for the tree once the menu is opened', async () => {
    const { http, fixture } = await renderMenu();
    TestBed.tick();

    http.expectNone('/api/v1/genres');

    await userEvent.click(screen.getByRole('button', { name: /Gêneros/ }));
    await answerTree(http, fixture);

    expect(screen.getByRole('link', { name: 'Fantasia' })).toBeInTheDocument();
  });

  it('lists each genre with its subgenres, linking to the filtered shelf', async () => {
    const { http, fixture } = await renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /Gêneros/ }));
    await answerTree(http, fixture);

    expect(screen.getByRole('link', { name: 'Fantasia' })).toHaveAttribute(
      'href',
      '/estante?genreId=1',
    );
    expect(screen.getByRole('link', { name: 'Alta fantasia' })).toHaveAttribute(
      'href',
      '/estante?genreId=2',
    );
    expect(screen.getByRole('link', { name: 'Ficção científica' })).toBeInTheDocument();
  });

  it('opens with the arrow down and lands on the first genre', async () => {
    const { http, fixture } = await renderMenu();
    const trigger = screen.getByRole('button', { name: /Gêneros/ });

    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await answerTree(http, fixture);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Fantasia' })).toHaveFocus();
  });

  it('closes with Escape and gives the focus back to the trigger', async () => {
    const { http, fixture } = await renderMenu();
    const trigger = screen.getByRole('button', { name: /Gêneros/ });
    await userEvent.click(trigger);
    await answerTree(http, fixture);

    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('link', { name: 'Fantasia' })).not.toBeInTheDocument();
  });

  it('keeps the tree after closing, instead of asking again', async () => {
    const { http, fixture } = await renderMenu();
    const trigger = screen.getByRole('button', { name: /Gêneros/ });
    await userEvent.click(trigger);
    await answerTree(http, fixture);

    await userEvent.keyboard('{Escape}');
    await userEvent.click(trigger);
    TestBed.tick();

    http.expectNone('/api/v1/genres');
    expect(screen.getByRole('link', { name: 'Fantasia' })).toBeInTheDocument();
  });

  it('says when there is no genre registered yet', async () => {
    const { http, fixture } = await renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /Gêneros/ }));
    await answerTree(http, fixture, []);

    expect(screen.getByText('Nenhum gênero cadastrado ainda.')).toBeInTheDocument();
  });

  it('reports a failure instead of showing an empty menu', async () => {
    const { http, fixture } = await renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /Gêneros/ }));
    TestBed.tick();
    http
      .expectOne('/api/v1/genres')
      .flush({ code: 'internal.error' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(screen.getByText('Não foi possível carregar os gêneros.')).toBeInTheDocument();
  });
});
