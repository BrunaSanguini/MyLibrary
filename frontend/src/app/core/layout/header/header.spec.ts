import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { Header } from './header';

describe('Header', () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it('links to the main areas of the app', async () => {
    await render(Header, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    const navigation = screen.getByRole('navigation', { name: 'Principal' });
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Minha Estante' })).toHaveAttribute('href', '/estante');
    expect(screen.getByRole('link', { name: 'Minha Livraria' })).toHaveAttribute('href', '/');
  });

  it('marks the current page in the menu', async () => {
    const { fixture } = await render(Header, {
      providers: [
        provideRouter([{ path: 'listas', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    await TestBed.inject(Router).navigateByUrl('/listas');
    await fixture.whenStable();

    expect(screen.getByRole('link', { name: 'Listas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  });

  it('switches the theme at once and saves it in the profile', async () => {
    const user = userEvent.setup();
    await render(Header, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/profile').flush({ displayName: 'Bru', theme: 'LIGHT' });

    await user.click(screen.getByRole('button', { name: 'Usar tema escuro' }));

    expect(await screen.findByRole('button', { name: 'Usar tema claro' })).toBeInTheDocument();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    const save = http.expectOne({ method: 'PUT', url: '/api/v1/profile' });
    expect(save.request.body).toEqual({ displayName: 'Bru', theme: 'DARK' });
  });

  it('goes back to the theme it had when the profile cannot be saved', async () => {
    const user = userEvent.setup();
    await render(Header, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/profile').flush({ theme: 'LIGHT' });

    await user.click(screen.getByRole('button', { name: 'Usar tema escuro' }));
    http
      .expectOne({ method: 'PUT', url: '/api/v1/profile' })
      .flush(null, { status: 503, statusText: 'Unavailable' });

    expect(await screen.findByRole('button', { name: 'Usar tema escuro' })).toBeInTheDocument();
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('shows the initial of the name in the link to the profile', async () => {
    const { fixture } = await render(Header, {
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/profile')
      .flush({ displayName: 'bru', theme: 'SYSTEM' });
    await fixture.whenStable();

    const link = await screen.findByRole('link', { name: 'Meu perfil' });
    expect(link).toHaveAttribute('href', '/perfil');
    expect(link).toHaveTextContent('B');
  });
});
