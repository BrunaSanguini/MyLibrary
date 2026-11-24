import { httpResource } from '@angular/common/http';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { BooksApi } from '@core/api/books-api';
import { CatalogApi } from '@core/api/catalog-api';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import { ListsApi, ListsPage } from '@core/api/lists-api';
import { ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { Button } from '@shared/ui/button/button';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '@shared/ui/icon/icon';
import { firstValueFrom, Observable, of } from 'rxjs';

import {
  booksOf,
  countOf,
  normalize,
  REGISTRY_KINDS,
  RegistryKind,
  RegistryKindInfo,
} from './registry-kinds';

/** One item of a catalog, whatever the catalog. */
interface Row {
  readonly id: number;
  readonly name: string;
  /** `13 livros · 3 subgêneros`, or the authors of a book. */
  readonly usage: string;
  /** The books that keep it from being deleted; none for books and lists. */
  readonly books: number;
  /** A subgenre shows the genre it belongs to. */
  readonly parent?: string;
  /** Books and lists open their own page. */
  readonly link?: readonly (string | number)[];
  /** A genre takes its subgenres with it. */
  readonly subgenreIds?: readonly number[];
}

interface Flash {
  readonly kind: 'ok' | 'warn';
  readonly text: string;
}

const LONGEST_NAME = 60;
const LONGEST_DESCRIPTION = 140;
/** The API serves at most this many items per page. */
const LARGEST_PAGE = 100;

/**
 * Cadastros: genres, subgenres, authors, publishers, books and lists, one at a time, chosen on the
 * menu at the side. Each one can be created (books are created on their own page), filtered and
 * deleted; an item that books still use cannot be deleted, and says why.
 */
@Component({
  selector: 'ml-registry',
  imports: [Button, ConfirmDialog, Icon, RouterLink],
  templateUrl: './registry.html',
  styleUrl: './registry.css',
})
export class Registry {
  readonly kind = input.required<RegistryKind>();
  readonly kindChange = output<RegistryKind>();

  private readonly genresApi = inject(GenresApi);
  private readonly catalogApi = inject(CatalogApi);
  private readonly shelfApi = inject(ShelfApi);
  private readonly listsApi = inject(ListsApi);
  private readonly booksApi = inject(BooksApi);
  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');
  private readonly nameField = viewChild<ElementRef<HTMLInputElement>>('nameField');

  protected readonly kinds = REGISTRY_KINDS;
  protected readonly info = computed<RegistryKindInfo>(
    () => REGISTRY_KINDS.find((kind) => kind.id === this.kind()) ?? REGISTRY_KINDS[0],
  );

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly parentId = signal<number | undefined>(undefined);
  protected readonly nameError = signal<string | undefined>(undefined);
  protected readonly filter = signal('');
  protected readonly flash = signal<Flash | undefined>(undefined);
  protected readonly busy = signal(false);
  /** The item the dialog asks about. */
  protected readonly pending = signal<Row | undefined>(undefined);

  // The tree serves the genres, the subgenres and the genre a new subgenre belongs to.
  protected readonly tree = httpResource<GenreTreeResponse[]>(() => this.genresApi.treeRequest());

  private readonly people = rxResource({
    params: () =>
      this.kind() === 'autores' || this.kind() === 'editoras' ? this.kind() : undefined,
    stream: ({ params }) =>
      this.catalogApi.all(params === 'autores' ? 'authors' : 'publishers') as Observable<
        { id: number; name: string; bookCount: number }[]
      >,
  });

  private readonly books = rxResource({
    params: () => (this.kind() === 'livros' ? true : undefined),
    stream: () => this.shelfApi.allBooks(),
  });

  private readonly lists = httpResource<ListsPage>(() =>
    this.kind() === 'listas' ? this.listsApi.listRequest(0, LARGEST_PAGE, 'name') : undefined,
  );

  // One card is enough to count: the answer is totalElements.
  private readonly authorCount = httpResource<{ totalElements: number }>(() =>
    this.catalogApi.listRequest('authors', undefined, 0, 1),
  );
  private readonly publisherCount = httpResource<{ totalElements: number }>(() =>
    this.catalogApi.listRequest('publishers', undefined, 0, 1),
  );
  private readonly bookCount = httpResource<ShelfPage>(() =>
    this.shelfApi.booksRequest({ size: 1 }),
  );
  private readonly listCount = httpResource<ListsPage>(() => this.listsApi.listRequest(0, 1));

  protected readonly genres = computed(() => (this.tree.hasValue() ? this.tree.value() : []));

  protected readonly counts = computed<Partial<Record<RegistryKind, number>>>(() => ({
    generos: this.tree.hasValue() ? this.genres().length : undefined,
    subgeneros: this.tree.hasValue()
      ? this.genres().reduce((sum, genre) => sum + genre.subgenres.length, 0)
      : undefined,
    autores: this.authorCount.value()?.totalElements,
    editoras: this.publisherCount.value()?.totalElements,
    livros: this.bookCount.value()?.totalElements,
    listas: this.listCount.value()?.totalElements,
  }));

  /** Every item of the open catalog, or undefined while it loads. */
  private readonly rows = computed<readonly Row[] | undefined>(() => {
    switch (this.kind()) {
      case 'generos':
        return this.tree.hasValue()
          ? this.genres().map((genre) => {
              const books =
                genre.bookCount +
                genre.subgenres.reduce((sum, subgenre) => sum + subgenre.bookCount, 0);
              const subgenres = genre.subgenres.length;
              return {
                id: genre.id,
                name: genre.name,
                usage: `${booksOf(genre.bookCount)} · ${subgenres === 1 ? '1 subgênero' : `${subgenres} subgêneros`}`,
                books,
                subgenreIds: genre.subgenres.map((subgenre) => subgenre.id),
              };
            })
          : undefined;
      case 'subgeneros':
        return this.tree.hasValue()
          ? this.genres()
              .flatMap((genre) =>
                genre.subgenres.map((subgenre) => ({
                  id: subgenre.id,
                  name: subgenre.name,
                  usage: booksOf(subgenre.bookCount),
                  books: subgenre.bookCount,
                  parent: genre.name,
                })),
              )
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
          : undefined;
      case 'autores':
      case 'editoras':
        return this.people.hasValue()
          ? this.people.value().map((entry) => ({
              id: entry.id,
              name: entry.name,
              usage: booksOf(entry.bookCount),
              books: entry.bookCount,
            }))
          : undefined;
      case 'livros':
        return this.books.hasValue()
          ? this.books.value().map((book) => ({
              id: book.id,
              name: book.title,
              usage: book.authors.join(', '),
              books: 0,
              link: ['/livro', book.id],
            }))
          : undefined;
      case 'listas':
        return this.lists.hasValue()
          ? this.lists.value().content.map((list) => ({
              id: list.id,
              name: list.name,
              usage: booksOf(list.bookCount),
              books: 0,
              link: ['/lista', list.id],
            }))
          : undefined;
    }
  });

  protected readonly loading = computed(() => this.rows() === undefined);

  protected readonly visible = computed(() => {
    const term = normalize(this.filter());
    const rows = this.rows() ?? [];
    return term === ''
      ? rows
      : rows.filter((row) => normalize(`${row.name} ${row.usage}`).includes(term));
  });

  protected readonly countText = computed(() => {
    const all = this.rows()?.length ?? 0;
    if (normalize(this.filter()) === '') {
      return countOf(all, this.info());
    }
    const found = this.visible().length;
    return found === 1 ? '1 encontrado' : `${found} encontrados`;
  });

  protected readonly loadError = computed(() => {
    const error: unknown =
      this.tree.error() ?? this.people.error() ?? this.books.error() ?? this.lists.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected readonly booksOf = booksOf;

  protected select(kind: RegistryKind): void {
    this.filter.set('');
    this.name.set('');
    this.description.set('');
    this.nameError.set(undefined);
    this.flash.set(undefined);
    this.kindChange.emit(kind);
  }

  protected typeName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.nameError.set(undefined);
  }

  protected typeDescription(event: Event): void {
    this.description.set((event.target as HTMLInputElement).value);
  }

  protected typeFilter(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }

  protected chooseParent(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.parentId.set(value > 0 ? value : undefined);
  }

  /** `Gênero “Terror” criado.` */
  protected async create(event: Event): Promise<void> {
    event.preventDefault();
    const info = this.info();
    const name = this.name().trim();
    const error = this.problemWith(name);
    if (error) {
      this.nameError.set(error);
      this.nameField()?.nativeElement.focus();
      return;
    }
    const parentId = this.kind() === 'subgeneros' ? this.parentId() : undefined;
    if (this.kind() === 'subgeneros' && parentId === undefined) {
      this.nameError.set('Escolha o gênero a que o subgênero pertence.');
      return;
    }
    this.busy.set(true);
    this.flash.set(undefined);
    try {
      await firstValueFrom(this.createRequest(name, parentId));
      const capital = info.one.charAt(0).toUpperCase() + info.one.slice(1);
      const done = info.feminine ? 'criada' : 'criado';
      const where =
        this.kind() === 'listas'
          ? 'Ela já aparece em Listas.'
          : `${info.feminine ? 'Ela' : 'Ele'} já aparece na lista do cadastro de livros.`;
      this.flash.set({ kind: 'ok', text: `${capital} “${name}” ${done}. ${where}` });
      this.name.set('');
      this.description.set('');
      this.reload();
    } catch (failure) {
      this.nameError.set(ApiError.from(failure).detail);
    } finally {
      this.busy.set(false);
    }
  }

  /** An item that books still use only says why it stays; the others ask before going. */
  protected askToDelete(row: Row): void {
    const info = this.info();
    if (row.books > 0) {
      const which = info.feminine ? 'esta' : 'este';
      this.flash.set({
        kind: 'warn',
        text: `“${row.name}” não pode ser ${info.feminine ? 'excluída' : 'excluído'}: ${booksOf(row.books)} ${row.books === 1 ? 'usa' : 'usam'} ${which} ${info.one}. Exclua ou edite os livros antes.`,
      });
      return;
    }
    this.pending.set(row);
    this.deleteDialog().open();
  }

  protected readonly dialogTitle = computed(() => {
    const row = this.pending();
    const info = this.info();
    return row ? `Excluir ${info.feminine ? 'a' : 'o'} ${info.one} “${row.name}”?` : '';
  });

  protected readonly dialogMessage = computed(() => {
    const row = this.pending();
    switch (this.kind()) {
      case 'generos': {
        const subgenres = row?.subgenreIds?.length ?? 0;
        const tail =
          subgenres === 0
            ? ''
            : subgenres === 1
              ? ' O 1 subgênero dele também será excluído.'
              : ` Os ${subgenres} subgêneros dele também serão excluídos.`;
        return `O gênero não tem livros.${tail} Esta ação não pode ser desfeita.`;
      }
      case 'livros':
        return 'As leituras, a resenha e as imagens dele também serão apagadas. Esta ação não pode ser desfeita.';
      case 'listas':
        return 'A lista será apagada. Os livros dela continuam na sua estante.';
      default:
        return 'Ninguém usa este cadastro. Esta ação não pode ser desfeita.';
    }
  });

  protected readonly deleteLabel = computed(() => `Excluir ${this.info().one}`);

  protected async delete(): Promise<void> {
    const row = this.pending();
    if (!row) {
      return;
    }
    const info = this.info();
    this.busy.set(true);
    try {
      await this.remove(row);
      this.flash.set({
        kind: 'ok',
        text: `${info.one.charAt(0).toUpperCase() + info.one.slice(1)} “${row.name}” ${info.feminine ? 'excluída' : 'excluído'}.`,
      });
      this.reload();
    } catch (failure) {
      this.flash.set({ kind: 'warn', text: ApiError.from(failure).detail });
    } finally {
      this.busy.set(false);
      this.pending.set(undefined);
      this.deleteDialog().close();
    }
  }

  private problemWith(name: string): string | undefined {
    const info = this.info();
    if (name === '') {
      return 'Escreva um nome antes de criar.';
    }
    if (name.length > LONGEST_NAME) {
      return `O nome tem no máximo ${LONGEST_NAME} caracteres.`;
    }
    if (this.kind() === 'listas' && this.description().trim().length > LONGEST_DESCRIPTION) {
      return `A descrição tem no máximo ${LONGEST_DESCRIPTION} caracteres.`;
    }
    const typed = normalize(name);
    if ((this.rows() ?? []).some((row) => normalize(row.name) === typed)) {
      return `Já existe ${info.feminine ? 'uma' : 'um'} ${info.one} chamad${info.feminine ? 'a' : 'o'} “${name}”.`;
    }
    return undefined;
  }

  private createRequest(name: string, parentId: number | undefined): Observable<unknown> {
    switch (this.kind()) {
      case 'generos':
        return this.catalogApi.createGenre(name);
      case 'subgeneros':
        return this.catalogApi.createGenre(name, parentId ?? null);
      case 'autores':
        return this.catalogApi.create('authors', name);
      case 'editoras':
        return this.catalogApi.create('publishers', name);
      case 'listas':
        return this.listsApi.create({
          name,
          description: this.description().trim() || undefined,
        });
      case 'livros':
        return of(undefined);
    }
  }

  /** A genre goes after its subgenres, one by one: the API refuses a genre that still has them. */
  private async remove(row: Row): Promise<void> {
    switch (this.kind()) {
      case 'generos':
        for (const id of row.subgenreIds ?? []) {
          await firstValueFrom(this.catalogApi.deleteGenre(id));
        }
        await firstValueFrom(this.catalogApi.deleteGenre(row.id));
        return;
      case 'subgeneros':
        return firstValueFrom(this.catalogApi.deleteGenre(row.id));
      case 'autores':
        return firstValueFrom(this.catalogApi.delete('authors', row.id));
      case 'editoras':
        return firstValueFrom(this.catalogApi.delete('publishers', row.id));
      case 'livros':
        return firstValueFrom(this.booksApi.delete(row.id));
      case 'listas':
        return firstValueFrom(this.listsApi.delete(row.id));
    }
  }

  private reload(): void {
    this.tree.reload();
    this.people.reload();
    this.books.reload();
    this.lists.reload();
    this.authorCount.reload();
    this.publisherCount.reload();
    this.bookCount.reload();
    this.listCount.reload();
  }
}
