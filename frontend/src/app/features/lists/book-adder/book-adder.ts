import {
  afterNextRender,
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
import { ApiError } from '@core/api/api-error';
import { ListsApi } from '@core/api/lists-api';
import { BookCardResponse, ShelfApi } from '@core/api/shelf-api';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { firstValueFrom } from 'rxjs';

/**
 * The panel "Adicionar livros" of a list: the whole library, without the books the list already
 * has, filtered as the reader types. Each book goes to the end of the list with one click and
 * leaves the panel; "Concluir" closes it.
 *
 * <p>The library comes once, every page of it, and the search happens here: it ignores accents
 * and case and looks at the title and the authors, so it answers at each key without a request.
 */
@Component({
  selector: 'ml-book-adder',
  imports: [BookCover, Button, Icon],
  templateUrl: './book-adder.html',
  styleUrl: './book-adder.css',
})
export class BookAdder {
  readonly listId = input.required<number>();
  /** Ids of the books the list already has. */
  readonly inList = input.required<ReadonlySet<number>>();

  readonly added = output<BookCardResponse>();
  readonly done = output<void>();

  private readonly shelfApi = inject(ShelfApi);
  private readonly listsApi = inject(ListsApi);
  private readonly searchField = viewChild.required<ElementRef<HTMLInputElement>>('searchField');

  protected readonly term = signal('');
  protected readonly failure = signal<string | undefined>(undefined);
  /** The book whose request is on its way, so its button cannot be pressed twice. */
  protected readonly adding = signal<number | undefined>(undefined);

  protected readonly library = rxResource({ stream: () => this.shelfApi.allBooks() });

  /** The books that can still enter the list. */
  private readonly available = computed(() =>
    (this.library.hasValue() ? this.library.value() : []).filter(
      (book) => !this.inList().has(book.id),
    ),
  );

  protected readonly found = computed(() => {
    const term = normalize(this.term());
    return term === ''
      ? this.available()
      : this.available().filter((book) =>
          normalize(`${book.title} ${book.authors.join(' ')}`).includes(term),
        );
  });

  protected readonly availableCount = computed(() => {
    const count = this.available().length;
    return count === 1 ? '1 livro disponível' : `${count} livros disponíveis`;
  });

  protected readonly libraryError = computed(() => {
    const error: unknown = this.library.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  constructor() {
    afterNextRender(() => this.searchField().nativeElement.focus());
  }

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

/** "Anéis" and "aneis" are the same search. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
