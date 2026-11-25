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
import { ApiError } from '@core/api/api-error';
import { BooksApi } from '@core/api/books-api';
import { BookCardResponse, ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { Button } from '@shared/ui/button/button';
import { toRoman } from '@shared/format/roman';
import { Icon } from '@shared/ui/icon/icon';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

/** How many books of the collection the search shows at once. */
const SHOWN = 8;

/**
 * Adicionar livro à série (spec C.14): a book of the collection that is not in the series yet,
 * found by title or author, goes in at a position. A book in another series moves to this one.
 */
@Component({
  selector: 'ml-series-add-dialog',
  imports: [Button, Icon, RouterLink],
  templateUrl: './series-add-dialog.html',
  styleUrl: './series-dialogs.css',
})
export class SeriesAddDialog {
  readonly seriesId = input.required<number>();
  readonly seriesName = input.required<string>();
  /** The volumes already in the series, which move down when a book goes in before them. */
  readonly volumes = input<readonly BookCardResponse[]>([]);
  readonly saved = output<string>();

  private readonly booksApi = inject(BooksApi);
  private readonly shelfApi = inject(ShelfApi);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly open = signal(false);
  protected readonly term = signal('');
  protected readonly bookId = signal<number | undefined>(undefined);
  protected readonly position = signal(1);
  protected readonly tried = signal(false);
  protected readonly busy = signal(false);
  protected readonly failure = signal<string | undefined>(undefined);

  private readonly found = httpResource<ShelfPage>(() =>
    this.open()
      ? this.shelfApi.booksRequest({ q: this.term().trim() || undefined, sort: 'title', size: 40 })
      : undefined,
  );

  /** The books of the search that are not in this series. */
  protected readonly choices = computed(() =>
    (this.found.value()?.content ?? [])
      .filter((book) => book.series?.id !== this.seriesId())
      .slice(0, SHOWN),
  );

  protected readonly loading = computed(() => this.found.isLoading());

  /** The position after the last volume, offered by default. */
  private readonly nextPosition = computed(() => {
    const positions = this.volumes().map((book) => book.series?.position ?? 0);
    return Math.floor(Math.max(0, ...positions)) + 1;
  });

  /** `Será o livro IV. Os livros seguintes descem uma posição.` */
  protected readonly positionHint = computed(() => {
    const position = this.position();
    if (!Number.isInteger(position) || position < 1) {
      return 'Use 1,5 para um livro entre o 1 e o 2.';
    }
    const after = this.following().length > 0 ? ' Os livros seguintes descem uma posição.' : '';
    return `Será o livro ${toRoman(position)}.${after}`;
  });

  /** The volumes at the chosen position or after it, when the position is a whole number. */
  private readonly following = computed(() => {
    const position = this.position();
    return Number.isInteger(position)
      ? this.volumes().filter((book) => (book.series?.position ?? 0) >= position)
      : [];
  });

  protected readonly problem = computed(() => {
    if (this.bookId() === undefined) {
      return 'Escolha um livro do acervo.';
    }
    return this.position() > 0 ? undefined : 'A posição precisa ser maior que zero.';
  });

  show(): void {
    this.term.set('');
    this.bookId.set(undefined);
    this.position.set(this.nextPosition());
    this.tried.set(false);
    this.failure.set(undefined);
    this.open.set(true);
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected closed(): void {
    this.open.set(false);
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected setPosition(value: string): void {
    const position = Number.parseFloat(value.replace(',', '.'));
    this.position.set(Number.isNaN(position) ? 0 : position);
  }

  protected metaOf(authors: readonly string[], series?: { name: string }): string {
    const by = authors.join(', ');
    return series ? `${by} · hoje em ${series.name}` : by;
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.tried.set(true);
    const bookId = this.bookId();
    if (this.problem() || bookId === undefined) {
      return;
    }
    this.busy.set(true);
    this.failure.set(undefined);
    try {
      // The last first, so two volumes never share a position on the way.
      const following = [...this.following()].sort(
        (a, b) => (b.series?.position ?? 0) - (a.series?.position ?? 0),
      );
      for (const book of following) {
        await firstValueFrom(
          this.booksApi.placeInSeries(book.id, this.seriesId(), (book.series?.position ?? 0) + 1),
        );
      }
      const saved = await firstValueFrom(
        this.booksApi.placeInSeries(bookId, this.seriesId(), this.position()),
      );
      this.saved.emit(saved.title);
      this.close();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.busy.set(false);
    }
  }
}
