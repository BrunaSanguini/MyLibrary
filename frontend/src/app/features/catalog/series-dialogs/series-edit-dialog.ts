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
import { CatalogApi } from '@core/api/catalog-api';
import { BookCardResponse } from '@core/api/shelf-api';
import { Button } from '@shared/ui/button/button';
import { toRoman } from '@shared/format/roman';
import { Icon } from '@shared/ui/icon/icon';
import { firstValueFrom } from 'rxjs';

/** What the modal edits of a series. */
export interface EditableSeries {
  readonly id: number;
  readonly name: string;
  readonly totalVolumes?: number;
  readonly description?: string;
}

const NAME_MAX = 120;
const DESCRIPTION_MAX = 2000;

/** One volume in the order of the modal, kept in the series or taken out of it. */
interface Volume {
  readonly book: BookCardResponse;
  readonly out: boolean;
}

/**
 * Editar série (spec C.14): name, number of volumes and description, the order of the volumes,
 * taking a book out of the series (with undo until saving) and deleting the series, which keeps
 * its books in the collection.
 */
@Component({
  selector: 'ml-series-edit-dialog',
  imports: [Button, Icon],
  templateUrl: './series-edit-dialog.html',
  styleUrl: './series-dialogs.css',
})
export class SeriesEditDialog {
  readonly series = input.required<EditableSeries>();
  /** The volumes in the order of the series. */
  readonly volumes = input.required<readonly BookCardResponse[]>();
  readonly saved = output();
  readonly deleted = output();

  private readonly booksApi = inject(BooksApi);
  private readonly catalogApi = inject(CatalogApi);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly name = signal('');
  protected readonly total = signal('');
  protected readonly description = signal('');
  protected readonly order = signal<readonly Volume[]>([]);
  protected readonly confirming = signal(false);
  protected readonly tried = signal(false);
  protected readonly busy = signal(false);
  protected readonly failure = signal<string | undefined>(undefined);

  protected readonly descriptionMax = DESCRIPTION_MAX;
  protected readonly nameMax = NAME_MAX;

  protected readonly kept = computed(() => this.order().filter((volume) => !volume.out).length);

  protected readonly problem = computed(() => {
    const name = this.name().trim();
    if (!name) {
      return 'Dê um nome à série.';
    }
    const total = this.total().trim();
    if (total && (!/^\d+$/.test(total) || Number(total) < 1)) {
      return 'O total de livros precisa ser um número inteiro maior que zero.';
    }
    if (total && Number(total) < this.kept()) {
      return `A série já tem ${this.kept()} livros no acervo.`;
    }
    return this.description().length > DESCRIPTION_MAX
      ? `A descrição pode ter até ${DESCRIPTION_MAX} caracteres.`
      : undefined;
  });

  show(): void {
    const series = this.series();
    this.name.set(series.name);
    this.total.set(series.totalVolumes ? String(series.totalVolumes) : '');
    this.description.set(series.description ?? '');
    this.order.set(this.volumes().map((book) => ({ book, out: false })));
    this.confirming.set(false);
    this.tried.set(false);
    this.failure.set(undefined);
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected move(index: number, step: number): void {
    this.order.update((order) => {
      const next = [...order];
      const [volume] = next.splice(index, 1);
      next.splice(index + step, 0, volume!);
      return next;
    });
  }

  protected toggleOut(index: number): void {
    this.order.update((order) =>
      order.map((volume, at) => (at === index ? { ...volume, out: !volume.out } : volume)),
    );
  }

  /** `Excluir a série? Os 3 livros continuam no acervo.` */
  protected readonly deleteQuestion = computed(() => {
    const count = this.volumes().length;
    if (count === 0) {
      return 'Excluir a série?';
    }
    return count === 1
      ? 'Excluir a série? O livro continua no acervo.'
      : `Excluir a série? Os ${count} livros continuam no acervo.`;
  });

  /** The position shown beside a volume kept in the series, in roman numerals. */
  protected positionAt(index: number): string {
    return toRoman(
      this.order()
        .slice(0, index + 1)
        .filter((volume) => !volume.out).length,
    );
  }

  /**
   * The series first; then the books taken out, and, when the order changed, the positions of
   * the books kept, numbered from 1.
   */
  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.tried.set(true);
    if (this.problem()) {
      return;
    }
    const series = this.series();
    this.busy.set(true);
    this.failure.set(undefined);
    try {
      const total = this.total().trim();
      await firstValueFrom(
        this.catalogApi.updateSeries(series.id, {
          name: this.name().trim(),
          totalVolumes: total ? Number(total) : undefined,
          description: this.description().trim() || undefined,
        }),
      );
      const order = this.order();
      const kept = order.filter((volume) => !volume.out).map((volume) => volume.book);
      const before = this.volumes().filter((book) => kept.includes(book));
      const reordered = kept.some((book, index) => book !== before[index]);
      for (const volume of order.filter((one) => one.out)) {
        await firstValueFrom(this.booksApi.placeInSeries(volume.book.id));
      }
      if (reordered) {
        for (const [index, book] of kept.entries()) {
          await firstValueFrom(this.booksApi.placeInSeries(book.id, series.id, index + 1));
        }
      }
      this.saved.emit();
      this.close();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(): Promise<void> {
    this.busy.set(true);
    this.failure.set(undefined);
    try {
      await firstValueFrom(this.catalogApi.delete('series', this.series().id));
      this.close();
      this.deleted.emit();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.busy.set(false);
    }
  }
}
