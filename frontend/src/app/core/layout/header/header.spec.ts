import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ProfileStore } from '@core/profile/profile-store';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Header } from './header';

describe('Header', () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it('links to the main areas of the app, in the order of the design', async () => {
    await render(Header, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    const navigation = screen.getByRole('navigation', { name: 'Principal' });
    const links = within(navigation).getAllByRole('link');
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Home',
      'Minha Estante',
      'Listas',
      'Catálogos',
      'Calendário',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/estante',
      '/listas',
      '/catalogos',
      '/calendario',
    ]);
  });

  it('has the crest and the name Ex·Libru as the link to the Home', async () => {
    const { container } = await render(Header, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    const logo = screen.getByRole('link', { name: 'Ex·Libru, início' });
    expect(logo).toHaveAttribute('href', '/');
    expect(logo.querySelector('ml-crest')).toBeInTheDocument();
    expect(container.querySelector('ml-wordmark [aria-hidden="true"]')).toHaveTextContent(
      'EX·LIBRU',
    );
  });

  async function openAt(url: string): Promise<void> {
    const { fixture } = await render(Header, {
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
  }

  function currentLinks(): string[] {
    return screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.getAttribute('aria-label') ?? link.textContent?.trim() ?? '');
  }

  it.each([
    ['/', 'Home'],
    ['/estante?status=READING', 'Minha Estante'],
    ['/livros/3', 'Minha Estante'],
    ['/livros/3/leitura', 'Minha Estante'],
    ['/livros/novo', 'Minha Estante'],
    ['/listas', 'Listas'],
    ['/listas/7', 'Listas'],
    ['/catalogos', 'Catálogos'],
    ['/autores/4', 'Catálogos'],
    ['/series/2', 'Catálogos'],
    ['/generos/9', 'Catálogos'],
    ['/editoras/5', 'Catálogos'],
    ['/calendario?mes=2026-11', 'Calendário'],
    ['/perfil', 'Meu perfil'],
  ])('at %s the current item is only %s', async (url, expected) => {
    await openAt(url);

    expect(currentLinks()).toEqual([expected]);
  });

  it('has no current item on the pages that are not in the menu', async () => {
    await openAt('/metas');

    expect(currentLinks()).toEqual([]);
  });

  it('does not take the Home for the current item just because "/" starts every address', async () => {
    await openAt('/livrosecretos');

    expect(currentLinks()).toEqual([]);
  });

  it('has the button of the theme, which says if the dark theme is on', async () => {
    await render(Header, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    const toggle = screen.getByRole('button', { name: 'Alternar tema claro e escuro' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches the theme at once and saves it in the profile', async () => {
    const user = userEvent.setup();
    await render(Header, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    void TestBed.inject(ProfileStore).load();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/profile').flush({ displayName: 'Bru', theme: 'LIGHT' });
    const toggle = screen.getByRole('button', { name: 'Alternar tema claro e escuro' });
    await vi.waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'));

    await user.click(toggle);

    await vi.waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'));
    expect(document.documentElement.dataset['theme']).toBe('dark');
    const save = http.expectOne({ method: 'PUT', url: '/api/v1/profile' });
    expect(save.request.body).toEqual({ displayName: 'Bru', theme: 'DARK' });
  });

  it('goes back to the theme it had when the profile cannot be saved', async () => {
    const user = userEvent.setup();
    await render(Header, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    void TestBed.inject(ProfileStore).load();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/profile').flush({ theme: 'LIGHT' });
    const toggle = screen.getByRole('button', { name: 'Alternar tema claro e escuro' });
    await vi.waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'));

    await user.click(toggle);
    http
      .expectOne({ method: 'PUT', url: '/api/v1/profile' })
      .flush(null, { status: 503, statusText: 'Unavailable' });

    await vi.waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'));
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('shows the initial of the name in the link to the profile', async () => {
    const { fixture } = await render(Header, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    void TestBed.inject(ProfileStore).load();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/profile')
      .flush({ displayName: 'bru', theme: 'SYSTEM' });
    await fixture.whenStable();

    const link = await screen.findByRole('link', { name: 'Meu perfil' });
    expect(link).toHaveAttribute('href', '/perfil');
    expect(link).toHaveTextContent('B');
  });
});
