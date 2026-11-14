import { Routes } from '@angular/router';

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
  { path: 'livros', loadChildren: () => import('@features/books/books.routes') },
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
    loadComponent: () => import('@features/catalog/group-page/group-page'),
    data: { kind: 'authors' },
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
    loadComponent: () => import('@features/catalog/group-page/group-page'),
    data: { kind: 'series' },
    title: 'Série',
  },
  {
    path: '**',
    loadComponent: () => import('@features/not-found/not-found-page/not-found-page'),
    title: 'Página não encontrada',
  },
];
