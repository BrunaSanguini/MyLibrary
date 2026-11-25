import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { unsavedChangesGuard } from '@core/routing/unsaved-changes-guard';

/**
 * Routes are visible in the address bar, so they are in Portuguese (ADR-0006). The page of one
 * item is in the singular — /livro/7, /autor/3 — and the listing is in the plural (ADR-0009).
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@features/home/home-page/home-page'),
    title: 'Início',
  },
  {
    path: 'estante',
    loadComponent: () => import('@features/shelf/shelf-page/shelf-page'),
    title: 'Minha Estante',
  },
  {
    path: 'estante/novo',
    loadComponent: () => import('@features/books/book-form-page/book-form-page'),
    canDeactivate: [unsavedChangesGuard],
    title: 'Adicionar livro',
  },
  // The import from the Open Library moved into the form; the search of the address fills its field.
  { path: 'estante/importar', redirectTo: 'estante/novo', pathMatch: 'full' },
  {
    path: 'livro/:id',
    loadComponent: () => import('@features/books/book-page/book-page'),
    // The review is written on the page itself.
    canDeactivate: [unsavedChangesGuard],
    title: 'Livro',
  },
  {
    path: 'livro/:id/editar',
    loadComponent: () => import('@features/books/book-form-page/book-form-page'),
    canDeactivate: [unsavedChangesGuard],
    title: 'Editar livro',
  },
  {
    path: 'livro/:id/leitura',
    loadComponent: () => import('@features/reading/reading-page/reading-page'),
    canDeactivate: [unsavedChangesGuard],
    title: 'Registrar leitura',
  },
  {
    path: 'listas',
    loadComponent: () => import('@features/lists/lists-page/lists-page'),
    title: 'Listas',
  },
  {
    path: 'lista/:id',
    loadComponent: () => import('@features/lists/list-page/list-page'),
    title: 'Lista',
  },
  {
    path: 'configuracoes',
    loadComponent: () => import('@features/settings/settings-page/settings-page'),
    // Destaques and Metas are saved with a button.
    canDeactivate: [unsavedChangesGuard],
    title: 'Configurações',
  },
  // The goals moved into Configurações; the old address opens their tab.
  {
    path: 'metas',
    pathMatch: 'full',
    redirectTo: () =>
      inject(Router).createUrlTree(['/configuracoes'], { queryParams: { aba: 'metas' } }),
  },
  {
    path: 'perfil',
    loadComponent: () => import('@features/profile/profile-page/profile-page'),
    title: 'Perfil',
  },
  {
    path: 'calendario',
    loadComponent: () => import('@features/calendar/calendar-page/calendar-page'),
    title: 'Calendário de leitura',
  },
  {
    path: 'catalogos',
    loadComponent: () => import('@features/catalog/catalog-page/catalog-page'),
    title: 'Catálogos',
  },
  // One page for genres and publishers; the route data says which one it is.
  {
    path: 'generos/:id',
    loadComponent: () => import('@features/catalog/group-page/group-page'),
    data: { kind: 'genres' },
    title: 'Gênero',
  },
  {
    path: 'autor/:id',
    loadComponent: () => import('@features/catalog/author-page/author-page'),
    title: 'Autor',
  },
  {
    path: 'editoras/:id',
    loadComponent: () => import('@features/catalog/group-page/group-page'),
    data: { kind: 'publishers' },
    title: 'Editora',
  },
  {
    path: 'serie/:id',
    loadComponent: () => import('@features/catalog/series-page/series-page'),
    title: 'Série',
  },
  // Addresses of the earlier versions, which may be in bookmarks. The ":id" is carried over, and
  // so are the query string and the fragment (/livros/7#minha-resenha).
  { path: 'livros/novo', redirectTo: 'estante/novo', pathMatch: 'full' },
  { path: 'livros/importar', redirectTo: 'estante/novo', pathMatch: 'full' },
  { path: 'livros/:id', redirectTo: 'livro/:id', pathMatch: 'full' },
  { path: 'livros/:id/editar', redirectTo: 'livro/:id/editar', pathMatch: 'full' },
  { path: 'livros/:id/leitura', redirectTo: 'livro/:id/leitura', pathMatch: 'full' },
  { path: 'listas/:id', redirectTo: 'lista/:id', pathMatch: 'full' },
  { path: 'autores/:id', redirectTo: 'autor/:id', pathMatch: 'full' },
  { path: 'series/:id', redirectTo: 'serie/:id', pathMatch: 'full' },
  {
    path: '**',
    loadComponent: () => import('@features/not-found/not-found-page/not-found-page'),
    title: 'Página não encontrada',
  },
];
