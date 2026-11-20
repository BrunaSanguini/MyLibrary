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
import { RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { BookListResponse, ListsApi, percentOf, readCountOf } from '@core/api/lists-api';
import { toFlag, toId } from '@core/api/query-params';
import { BookCardResponse } from '@core/api/shelf-api';
import { relativeTimeSince } from '@core/time/relative-time';
import { NOW } from '@core/time/today';
import { toRoman } from '@shared/format/roman';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Breadcrumbs, Crumb } from '@shared/ui/breadcrumbs/breadcrumbs';
import { Button } from '@shared/ui/button/button';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { ListCovers } from '@shared/ui/list-covers/list-covers';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { firstValueFrom, Observable } from 'rxjs';

import { BookAdder } from '../book-adder/book-adder';
import { ListForm } from '../list-form/list-form';

type Direction = 'up' | 'down';

/** What takes the place of the card about the list: nothing, the search of books or the form. */
type Panel = 'adicionar' | 'editar' | undefined;

/** The last change to the books, while it can still be undone. */
interface Undo {
  readonly label: string;
  readonly run: () => void;
}

/** The pill of each book: how its reading is, or that it is not on the shelf yet. */
const PILLS: Readonly<Record<BookCardResponse['status'] | 'WISHLIST', string>> = {
  READ: 'Lido',
  READING: 'Lendo agora',
  WANT_TO_READ: 'Quero ler',
  ABANDONED: 'Abandonado',
  WISHLIST: 'Wishlist',
};

const RATING = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/**
 * One list: the card about it, with every action of the list, and its books in the order the
 * reader chose.
 *
 * <p>Reordering is done with two buttons per book, so it works the same with the mouse, the
 * keyboard and a screen reader: the focus follows the book that moved and a live region says its
 * new position. The screen changes first and the request follows; if the server refuses, the list
 * is fetched again and shows what was really saved. Adding and removing a book can be undone from
 * the same bar that announces them.
 */
@Component({
  selector: 'ml-list-page',
  imports: [
    BookAdder,
    BookCover,
    Breadcrumbs,
    Button,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Icon,
    ListCovers,
    ListForm,
    ProgressBar,
    RouterLink,
    Skeleton,
  ],
  templateUrl: './list-page.html',
  styleUrl: './list-page.css',
})
export default class ListPage {
  readonly id = input(undefined, { transform: toId });
  /** `?adicionar=true`, from "Adicionar livros" on the Listas page: the panel opens right away. */
  readonly adicionar = input(undefined, { transform: toFlag });

  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly listsApi = inject(ListsApi);
  private readonly now = inject(NOW);

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');

  protected readonly list = httpResource<BookListResponse>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.listsApi.oneRequest(id);
  });

  private readonly saved = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.listsApi.books(params),
  });

  /** What is on the screen: what the server has, until a change here goes first. */
  protected readonly books = linkedSignal<readonly BookCardResponse[] | undefined>(() =>
    this.saved.hasValue() ? this.saved.value() : undefined,
  );

  protected readonly inList = computed(() => new Set((this.books() ?? []).map((book) => book.id)));

  protected readonly panel = signal<Panel>(undefined);
  protected readonly pinning = signal(false);
  protected readonly deleting = signal(false);
  /** The name of the list once it is deleted: the page then only says so. */
  protected readonly deleted = signal<string | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);
  /** Read by screen readers after each change. */
  protected readonly announcement = signal('');
  protected readonly undo = signal<Undo | undefined>(undefined);

  private readonly error = computed(() => {
    const error: unknown = this.list.error() ?? this.saved.error();
    return error === undefined ? undefined : ApiError.from(error);
  });

  /** An id that is not a number can only be a mistyped address, the same as a list that is gone. */
  protected readonly notFound = computed(
    () => this.id() === undefined || this.error()?.code === 'list.not-found',
  );
  protected readonly errorMessage = computed(() => this.error()?.detail);

  protected readonly crumbs = computed<readonly Crumb[]>(() => [
    { label: 'Home', link: '/' },
    { label: 'Listas', link: '/listas' },
    { label: this.list.value()?.name ?? 'Lista' },
  ]);

  protected readonly percent = computed(() => {
    const list = this.list.value();
    return list ? percentOf(list) : 0;
  });

  /** `atualizada há 3 dias · 1 na wishlist`, or `· todos na estante`. */
  protected readonly meta = computed(() => {
    const list = this.list.value();
    if (!list) {
      return '';
    }
    const updated = `atualizada ${relativeTimeSince(list.updatedAt, this.now())}`;
    if (list.bookCount === 0) {
      return updated;
    }
    return list.wishlistCount === 0
      ? `${updated} · todos na estante`
      : `${updated} · ${list.wishlistCount} na wishlist`;
  });

  protected readonly placeholders = [0, 1, 2];
  protected readonly readCountOf = readCountOf;
  protected readonly toRoman = toRoman;

  /** Requests leave in the order of the clicks, so the last order saved is the one on the screen. */
  private queue: Promise<void> = Promise.resolve();
  /** `?adicionar=true` opens the panel once per visit; after that it is the reader's. */
  private openedFromUrl = false;

  constructor() {
    effect(() => {
      if (this.adicionar() && !this.openedFromUrl && this.list.hasValue()) {
        this.openedFromUrl = true;
        this.panel.set('adicionar');
      }
    });
  }

  protected pillOf(book: BookCardResponse): { label: string; kind: string } {
    const kind = book.ownership === 'WISHLIST' ? 'WISHLIST' : book.status;
    return { label: PILLS[kind], kind };
  }

  protected ratingOf(book: BookCardResponse): string {
    return book.rating === undefined || book.rating === null
      ? '—'
      : `${RATING.format(book.rating)} ★`;
  }

  protected openPanel(panel: Exclude<Panel, undefined>): void {
    this.panel.set(panel);
  }

  /** Back to the card, with the focus on the button that opened the panel. */
  protected closePanel(): void {
    const closed = this.panel();
    this.panel.set(undefined);
    this.focusAfterRender(
      closed === 'editar' ? '[data-action="editar"]' : '[data-action="adicionar"]',
    );
  }

  protected onSaved(): void {
    this.announce('Lista atualizada.');
    this.list.reload();
    this.closePanel();
  }

  protected async togglePin(): Promise<void> {
    const list = this.list.value();
    if (!list) {
      return;
    }
    this.failure.set(undefined);
    this.pinning.set(true);
    try {
      if (list.pinned) {
        await firstValueFrom(this.listsApi.unpin(list.id));
        this.announce('Lista desafixada.');
      } else {
        await firstValueFrom(this.listsApi.pin(list.id));
        this.announce('Lista fixada: ela agora aparece em destaque na página Listas.');
      }
      this.list.reload();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.pinning.set(false);
    }
  }

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
    this.announce(`${book.title} agora é o ${target + 1}º de ${reordered.length}.`);
    this.keepFocusOn(book.id, direction);
    this.save(() => this.listsApi.reorder(this.listId(), ids(reordered)));
  }

  /** The book leaves the screen at once; Desfazer puts it back where it was. */
  protected remove(book: BookCardResponse): void {
    const before = this.books() ?? [];
    this.books.set(before.filter(({ id }) => id !== book.id));
    this.announce(`“${book.title}” saiu da lista.`, () => {
      this.books.set(before);
      this.announce('Remoção desfeita.');
      this.save(() => this.listsApi.addBook(this.listId(), book.id), true);
      this.save(() => this.listsApi.reorder(this.listId(), ids(before)));
    });
    this.save(() => this.listsApi.removeBook(this.listId(), book.id), true);
  }

  /** The panel already saved it; Desfazer takes it out again. */
  protected onAdded(book: BookCardResponse): void {
    this.books.update((books) => [...(books ?? []), book]);
    this.announce(`“${book.title}” entrou na lista.`, () => {
      this.books.update((books) => books?.filter(({ id }) => id !== book.id));
      this.announce('Adição desfeita.');
      this.save(() => this.listsApi.removeBook(this.listId(), book.id), true);
    });
    this.list.reload();
  }

  protected runUndo(): void {
    const undo = this.undo();
    this.undo.set(undefined);
    undo?.run();
  }

  protected retry(): void {
    this.list.reload();
    this.saved.reload();
  }

  protected async delete(): Promise<void> {
    const name = this.list.value()?.name ?? '';
    this.deleting.set(true);
    try {
      await firstValueFrom(this.listsApi.delete(this.listId()));
      this.deleteDialog()?.close();
      this.deleted.set(name);
    } catch (error) {
      this.deleteDialog()?.close();
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.deleting.set(false);
    }
  }

  private listId(): number {
    return this.id() ?? 0;
  }

  /** A new message replaces the last one, and with it the chance to undo the last change. */
  private announce(message: string, undo?: () => void): void {
    this.announcement.set(message);
    this.undo.set(undo ? { label: message, run: undo } : undefined);
  }

  private save(request: () => Observable<void>, countsChanged = false): void {
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

  private focusAfterRender(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
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

function ids(books: readonly BookCardResponse[]): number[] {
  return books.map(({ id }) => id);
}
