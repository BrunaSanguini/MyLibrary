import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { Breadcrumbs, Crumb } from './breadcrumbs';

@Component({
  imports: [Breadcrumbs],
  template: `<ml-breadcrumbs [items]="items" />`,
})
class Host {
  readonly items: Crumb[] = [
    { label: 'Estante', link: '/estante' },
    { label: 'Dom Casmurro', link: ['/livros', 42] },
    { label: 'Editar' },
  ];
}

describe('Breadcrumbs', () => {
  it('links every step but the page itself, marked as the current one', async () => {
    await render(Host, { providers: [provideRouter([])] });

    const trail = screen.getByRole('navigation', { name: 'Trilha de navegação' });
    const links = within(trail).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Estante', 'Dom Casmurro']);
    expect(links[0]).toHaveAttribute('href', '/estante');
    expect(links[1]).toHaveAttribute('href', '/livros/42');
    expect(within(trail).getByText('Editar')).toHaveAttribute('aria-current', 'page');
    expect(within(trail).getAllByRole('listitem')).toHaveLength(3);
  });
});
