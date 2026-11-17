import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GenreEntry, GenreFields } from './genre-fields';

const FANTASY: GenreEntry = { id: 1, name: 'Fantasia', parentId: null };
const HIGH_FANTASY: GenreEntry = { id: 2, name: 'Alta fantasia', parentId: 1 };
const NOVEL: GenreEntry = { id: 5, name: 'Romance', parentId: null };

async function renderFields(genres: GenreEntry[]) {
  const changed = vi.fn();
  await render(GenreFields, {
    inputs: { genres },
    on: { changed },
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { changed };
}

describe('GenreFields', () => {
  it('asks for a genre before offering the subgenres', async () => {
    await renderFields([]);

    expect(screen.getByRole('combobox', { name: 'Gêneros' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Subgêneros' })).not.toBeInTheDocument();
    expect(screen.getByText(/Escolha um gênero para adicionar os subgêneros/)).toBeInTheDocument();
  });

  it('shows the genres and the subgenres apart', async () => {
    await renderFields([FANTASY, HIGH_FANTASY, NOVEL]);

    expect(screen.getByRole('combobox', { name: 'Subgêneros' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Gêneros escolhidos' })).toHaveTextContent(
      /Fantasia\s+Romance/,
    );
    expect(screen.getByRole('list', { name: 'Subgêneros escolhidos' })).toHaveTextContent(
      'Alta fantasia',
    );
  });

  it('takes the subgenres away with their genre', async () => {
    const { changed } = await renderFields([FANTASY, HIGH_FANTASY, NOVEL]);

    await userEvent.click(screen.getByRole('button', { name: 'Remover gênero Fantasia' }));

    expect(changed).toHaveBeenCalledWith([NOVEL]);
  });

  it('takes away only the subgenre', async () => {
    const { changed } = await renderFields([FANTASY, HIGH_FANTASY]);

    await userEvent.click(screen.getByRole('button', { name: 'Remover subgênero Alta fantasia' }));

    expect(changed).toHaveBeenCalledWith([FANTASY]);
  });
});
