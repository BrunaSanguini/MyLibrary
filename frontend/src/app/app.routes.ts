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
    path: '**',
    loadComponent: () => import('@features/not-found/not-found-page/not-found-page'),
    title: 'Página não encontrada',
  },
];
