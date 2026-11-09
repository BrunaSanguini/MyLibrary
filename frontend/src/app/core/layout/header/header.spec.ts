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
    await render(Header, { providers: [provideRouter([])] });

    const navigation = screen.getByRole('navigation', { name: 'Principal' });
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Minha Estante' })).toHaveAttribute('href', '/estante');
    expect(screen.getByRole('link', { name: 'Minha Livraria' })).toHaveAttribute('href', '/');
  });

  it('marks the current page in the menu', async () => {
    const { fixture } = await render(Header, {
      providers: [provideRouter([{ path: 'listas', children: [] }])],
    });

    await TestBed.inject(Router).navigateByUrl('/listas');
    await fixture.whenStable();

    expect(screen.getByRole('link', { name: 'Listas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  });

  it('switches between the light and the dark theme', async () => {
    const user = userEvent.setup();
    await render(Header, { providers: [provideRouter([])] });

    await user.click(screen.getByRole('button', { name: 'Usar tema escuro' }));

    expect(await screen.findByRole('button', { name: 'Usar tema claro' })).toBeInTheDocument();
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});
