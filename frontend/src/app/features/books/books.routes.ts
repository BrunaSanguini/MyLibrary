import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@core/routing/unsaved-changes-guard';

/** Routes under /livros. "novo" comes before ":id", or it would be read as an id. */
const routes: Routes = [
  {
    path: 'novo',
    loadComponent: () => import('./book-form-page/book-form-page'),
    canDeactivate: [unsavedChangesGuard],
    title: 'Cadastrar livro',
  },
  {
    path: ':id',
    loadComponent: () => import('./book-page/book-page'),
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
