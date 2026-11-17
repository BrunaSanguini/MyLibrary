import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/api/api-error';
import { ListsApi } from '@core/api/lists-api';
import { BookCardResponse, ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Button } from '@shared/ui/button/button';
import { debounceTime, firstValueFrom } from 'rxjs';

const TYPING_PAUSE = 250;
const MIN_TERM = 2;
const RESULTS = 8;

/**
 * Finds books of the shelf by title, author or ISBN and adds them to a list, one click each.
 * The ones already in the list show up marked instead of offering the button again.
 */
@Component({
  selector: 'ml-book-adder',
  imports: [BookCover, Button],
  templateUrl: './book-adder.html',
  styleUrl: './book-adder.css',
})
export class BookAdder {
  readonly listId = input.required<number>();
  /** Ids of the books the list already has. */
  readonly inList = input.required<ReadonlySet<number>>();

  readonly added = output<BookCardResponse>();

  private readonly shelfApi = inject(ShelfApi);
  private readonly listsApi = inject(ListsApi);

  protected readonly term = signal('');
  protected readonly failure = signal<string | undefined>(undefined);
  /** The book whose request is on its way, so its button cannot be pressed twice. */
  protected readonly adding = signal<number | undefined>(undefined);

  private readonly settledTerm = toSignal(
    toObservable(this.term).pipe(debounceTime(TYPING_PAUSE)),
    {
      initialValue: '',
    },
  );

  /** A term shorter than two characters would match most of the shelf, so it asks nothing. */
  protected readonly query = computed(() => {
    const term = this.settledTerm().trim();
    return term.length >= MIN_TERM ? term : undefined;
  });

  protected readonly results = httpResource<ShelfPage>(() => {
    const q = this.query();
    return q ? this.shelfApi.booksRequest({ q, sort: 'title', size: RESULTS }) : undefined;
  });

  protected readonly books = computed(() =>
    this.query() ? this.results.value()?.content : undefined,
  );

  protected type(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
  }

  protected async add(book: BookCardResponse): Promise<void> {
    this.failure.set(undefined);
    this.adding.set(book.id);
    try {
      await firstValueFrom(this.listsApi.addBook(this.listId(), book.id));
      this.added.emit(book);
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.adding.set(undefined);
    }
  }
}
