import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppTitleStrategy } from '@core/layout/app-title-strategy';
import { screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import NotFoundPage from './not-found-page';

describe('NotFoundPage', () => {
  it('shows the 404 page with a way back home for unknown addresses', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: NotFoundPage, title: 'Página não encontrada' }]),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
      ],
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/endereco-que-nao-existe');

    expect(screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/');
    expect(TestBed.inject(Title).getTitle()).toBe('Página não encontrada · Minha Livraria');
  });
});
