import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { routes } from './app.routes';

describe('routes', () => {
  async function navigate(url: string): Promise<{ url: string; route: string | undefined }> {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);

    let current = router.routerState.snapshot.root;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return { url: router.url, route: current.routeConfig?.path };
  }

  describe('addresses of the earlier versions', () => {
    it.each([
      ['/livros/novo', '/estante/novo'],
      ['/livros/importar', '/estante/importar'],
      ['/livros/42', '/livro/42'],
      ['/livros/42/editar', '/livro/42/editar'],
      ['/livros/42/leitura', '/livro/42/leitura'],
      ['/listas/4', '/lista/4'],
      ['/autores/7', '/autor/7'],
      ['/series/3', '/serie/3'],
      ['/metas', '/configuracoes?aba=metas'],
    ])('send %s to %s', async (old, current) => {
      const { url } = await navigate(old);

      expect(url).toBe(current);
    });

    it.each([
      ['/livros/importar?q=hobbit&edicao=OL1M', '/estante/importar?q=hobbit&edicao=OL1M'],
      ['/livros/1#titulo-resenha', '/livro/1#titulo-resenha'],
    ])('keep the query string and the fragment of %s', async (old, current) => {
      const { url } = await navigate(old);

      expect(url).toBe(current);
    });
  });

  describe('current addresses', () => {
    it.each([
      ['/', ''],
      ['/estante', 'estante'],
      ['/estante/novo', 'estante/novo'],
      ['/estante/importar', 'estante/importar'],
      ['/livro/42', 'livro/:id'],
      ['/livro/42/editar', 'livro/:id/editar'],
      ['/livro/42/leitura', 'livro/:id/leitura'],
      ['/listas', 'listas'],
      ['/lista/4', 'lista/:id'],
      ['/autor/7', 'autor/:id'],
      ['/serie/3', 'serie/:id'],
      ['/generos/2', 'generos/:id'],
      ['/editoras/5', 'editoras/:id'],
      ['/catalogos?tipo=autores', 'catalogos'],
      ['/configuracoes?aba=destaques', 'configuracoes'],
    ])('open %s as %s, with no redirect', async (url, route) => {
      const result = await navigate(url);

      expect(result).toEqual({ url, route });
    });
  });

  it.each(['/livros', '/livro', '/autores', '/lista', '/series'])(
    'does not know %s on its own, which is no page of the app',
    async (url) => {
      const result = await navigate(url);

      expect(result).toEqual({ url, route: '**' });
    },
  );
});
