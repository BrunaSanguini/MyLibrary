import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@core/routing/unsaved-changes-guard';

/** Routes are visible in the address bar, so they are in Portuguese (ADR-0006). */
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
  // Before the routes of the books: the reading is another feature under the same address.
  {
    path: 'livros/:id/leitura',
    loadComponent: () => import('@features/reading/reading-page/reading-page'),
    canDeactivate: [unsavedChangesGuard],
    title: 'Registrar leitura',
  },
  { path: 'livros', loadChildren: () => import('@features/books/books.routes') },
  {
    path: 'listas',
    loadComponent: () => import('@features/lists/lists-page/lists-page'),
    title: 'Listas',
  },
  {
    path: 'listas/:id',
    loadComponent: () => import('@features/lists/list-page/list-page'),
    title: 'Lista',
  },
  {
    path: 'metas',
    loadComponent: () => import('@features/goals/goals-page/goals-page'),
    title: 'Metas',
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
  // One page for the four groupings; the route data says which one it is.
  {
    path: 'generos/:id',
    loadComponent: () => import('@features/catalog/group-page/group-page'),
    data: { kind: 'genres' },
    title: 'Gênero',
  },
  {
    path: 'autores/:id',
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
    path: 'series/:id',
    loadComponent: () => import('@features/catalog/series-page/series-page'),
    title: 'Série',
  },
  {
    path: '**',
    loadComponent: () => import('@features/not-found/not-found-page/not-found-page'),
    title: 'Página não encontrada',
  },
];
