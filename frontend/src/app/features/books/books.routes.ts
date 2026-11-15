import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@core/routing/unsaved-changes-guard';

/** Routes under /livros. "novo" and "importar" come before ":id", or they would be read as ids. */
const routes: Routes = [
  {
    path: 'novo',
    loadComponent: () => import('./book-form-page/book-form-page'),
    canDeactivate: [unsavedChangesGuard],
    title: 'Cadastrar livro',
  },
  {
    path: 'importar',
    loadComponent: () => import('./book-import-page/book-import-page'),
    title: 'Importar livro',
  },
  {
    path: ':id',
    loadComponent: () => import('./book-page/book-page'),
    // The review is written on the page itself.
    canDeactivate: [unsavedChangesGuard],
    title: 'Livro',
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./book-form-page/book-form-page'),
    canDeactivate: [unsavedChangesGuard],
    title: 'Editar livro',
  },
];

export default routes;
