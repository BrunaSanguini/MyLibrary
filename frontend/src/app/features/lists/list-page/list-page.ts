import { httpResource } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { BookListResponse, ListsApi, readCountOf } from '@core/api/lists-api';
import { toFlag, toId } from '@core/api/query-params';
import { BOOK_STATUS_LABELS } from '@core/api/reading-api';
import { BookCardResponse } from '@core/api/shelf-api';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Button } from '@shared/ui/button/button';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { firstValueFrom } from 'rxjs';

import { BookAdder } from '../book-adder/book-adder';
import { ListForm } from '../list-form/list-form';

type Direction = 'up' | 'down';

/**
 * One list: its books in the order the reader chose, which can be changed here.
 *
 * <p>Reordering is done with two buttons per book, so it works the same with the mouse, the
 * keyboard and a screen reader: the focus follows the book that moved and a live region says its
 * new position. The screen changes first and the request follows; if the server refuses, the list
 * is fetched again and shows what was really saved.
 */
@Component({
  selector: 'ml-list-page',
  imports: [
    BookAdder,
    BookCover,
    Button,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Icon,
    ListForm,
    RouterLink,
    Skeleton,
  ],
  templateUrl: './list-page.html',
  styleUrl: './list-page.css',
})
export default class ListPage {
  readonly id = input(undefined, { transform: toId });
  /** `?adicionar=true`, from "Adicionar livros" on the Listas page: the search of the shelf takes the focus. */
  readonly adicionar = input(undefined, { transform: toFlag });

  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly listsApi = inject(ListsApi);

  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  protected readonly list = httpResource<BookListResponse>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.listsApi.oneRequest(id);
  });

  private readonly saved = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.listsApi.books(params),
  });

  /** What is on the screen: what the server has, until a move or a removal changes it here first. */
  protected readonly books = linkedSignal<readonly BookCardResponse[] | undefined>(() =>
    this.saved.hasValue() ? this.saved.value() : undefined,
  );

  protected readonly inList = computed(() => new Set((this.books() ?? []).map((book) => book.id)));

  protected readonly editing = signal(false);
  protected readonly deleting = signal(false);
  protected readonly failure = signal<string | undefined>(undefined);
  /** Read by screen readers after each change to the books. */
  protected readonly announcement = signal('');

  private readonly error = computed(() => {
    const error: unknown = this.list.error() ?? this.saved.error();
    return error === undefined ? undefined : ApiError.from(error);
  });

  /** An id that is not a number can only be a mistyped address, the same as a list that is gone. */
  protected readonly notFound = computed(
    () => this.id() === undefined || this.error()?.code === 'list.not-found',
  );
  protected readonly errorMessage = computed(() => this.error()?.detail);

  protected readonly placeholders = [0, 1, 2];
  protected readonly statusLabels = BOOK_STATUS_LABELS;
  protected readonly readCountOf = readCountOf;

  /** Only once per visit: after that the focus is the reader's. */
  private searchFocused = false;

  constructor() {
    effect(() => {
      if (!this.adicionar() || this.searchFocused || !this.list.hasValue()) {
        return;
      }
      this.searchFocused = true;
      afterNextRender(
        () => this.host.nativeElement.querySelector<HTMLInputElement>('#busca-lista')?.focus(),
        { injector: this.injector },
      );
    });
  }

  /** Requests leave in the order of the clicks, so the last order saved is the one on the screen. */
  private queue: Promise<void> = Promise.resolve();

  protected move(index: number, direction: Direction): void {
    const books = this.books();
    const target = direction === 'up' ? index - 1 : index + 1;
    const book = books?.[index];
    const other = books?.[target];
    if (!books || !book || !other) {
      return;
    }
    const reordered = [...books];
    reordered[index] = other;
    reordered[target] = book;
    this.books.set(reordered);
    this.announcement.set(`${book.title} agora é o ${target + 1}º de ${reordered.length}.`);
    this.keepFocusOn(book.id, direction);
    this.save(() =>
      this.listsApi.reorder(
        this.listId(),
        reordered.map(({ id }) => id),
      ),
    );
  }

  protected remove(book: BookCardResponse): void {
    this.books.update((books) => books?.filter(({ id }) => id !== book.id));
    this.announcement.set(`${book.title} saiu da lista.`);
    this.save(() => this.listsApi.removeBook(this.listId(), book.id), true);
  }

  protected onAdded(book: BookCardResponse): void {
    this.books.update((books) => [...(books ?? []), book]);
    this.announcement.set(`${book.title} entrou na lista.`);
    this.list.reload();
  }

  protected onSaved(): void {
    this.editing.set(false);
    this.list.reload();
  }

  protected retry(): void {
    this.list.reload();
    this.saved.reload();
  }

  protected async delete(): Promise<void> {
    this.deleting.set(true);
    try {
      await firstValueFrom(this.listsApi.delete(this.listId()));
      this.deleteDialog().close();
      await this.router.navigate(['/listas']);
    } catch (error) {
      this.deleteDialog().close();
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.deleting.set(false);
    }
  }

  private listId(): number {
    return this.id() ?? 0;
  }

  private save(request: () => ReturnType<ListsApi['reorder']>, countsChanged = false): void {
    this.failure.set(undefined);
    this.queue = this.queue.then(async () => {
      try {
        await firstValueFrom(request());
        if (countsChanged) {
          this.list.reload();
        }
      } catch (error) {
        this.failure.set(ApiError.from(error).detail);
        this.retry();
      }
    });
  }

  /**
   * Moving a row takes its buttons out of the page for an instant, and the focus with them. This
   * puts it back on the button that was pressed, or on its pair when the book reached an end of
   * the list and that button is now disabled.
   */
  private keepFocusOn(bookId: number, direction: Direction): void {
    afterNextRender(
      () => {
        const row = this.host.nativeElement.querySelector(`[data-book="${bookId}"]`);
        const pressed = row?.querySelector<HTMLButtonElement>(`[data-move="${direction}"]`);
        const pair = row?.querySelector<HTMLButtonElement>(
          `[data-move="${direction === 'up' ? 'down' : 'up'}"]`,
        );
        (pressed?.disabled ? pair : pressed)?.focus();
      },
      { injector: this.injector },
    );
  }
}
