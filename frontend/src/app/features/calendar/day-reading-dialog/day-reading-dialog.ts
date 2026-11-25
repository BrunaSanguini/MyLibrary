import { httpResource } from '@angular/common/http';
import { Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { ApiError } from '@core/api/api-error';
import { ReadingApi } from '@core/api/reading-api';
import { ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { IsoDate, parseIsoDate, TODAY } from '@core/time/today';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { firstValueFrom } from 'rxjs';

const LONG = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' });

/** What was registered, for the line the calendar shows after saving. */
export interface DayReading {
  readonly date: IsoDate;
  readonly title: string;
  readonly pages: number;
}

/**
 * Registrar leitura neste dia (spec C.14): a session of one day for a book being read, or an
 * abandoned one taken up again, with an optional note and the end of the book. Nothing leaves
 * the calendar.
 */
@Component({
  selector: 'ml-day-reading-dialog',
  imports: [Button, Icon],
  templateUrl: './day-reading-dialog.html',
  styleUrl: './day-reading-dialog.css',
})
export class DayReadingDialog {
  readonly saved = output<DayReading>();

  private readonly readingApi = inject(ReadingApi);
  private readonly shelfApi = inject(ShelfApi);
  private readonly todayOf = inject(TODAY);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** The books being read, and the abandoned ones that can be taken up again. */
  protected readonly books = httpResource<ShelfPage>(() =>
    this.open()
      ? this.shelfApi.booksRequest({
          status: ['READING', 'ABANDONED'],
          wishlist: false,
          sort: 'title',
          size: 100,
        })
      : undefined,
  );

  protected readonly open = signal(false);
  protected readonly date = signal<IsoDate>('');
  protected readonly bookId = signal<number | undefined>(undefined);
  protected readonly pages = signal(0);
  protected readonly note = signal('');
  protected readonly end = signal<'finished' | 'abandoned' | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly busy = signal(false);
  protected readonly tried = signal(false);

  protected readonly today = computed(() => this.todayOf());

  /** `quinta-feira, 19 de novembro de 2026 · hoje`. */
  protected readonly dateLine = computed(() => {
    const date = this.date();
    if (!date) {
      return '';
    }
    const text = LONG.format(parseIsoDate(date));
    return date === this.today() ? `${text} · hoje` : text;
  });

  protected readonly chosen = computed(() => this.bookId() ?? this.books.value()?.content[0]?.id);

  protected readonly problem = computed(() => {
    if (this.date() > this.today()) {
      return 'Escolha um dia que já passou.';
    }
    if (this.pages() <= 0 && !this.end()) {
      return 'Informe as páginas lidas ou marque terminei/abandonei.';
    }
    return undefined;
  });

  /** Opens on the day picked in the calendar. */
  show(date: IsoDate): void {
    this.date.set(date);
    this.bookId.set(undefined);
    this.pages.set(0);
    this.note.set('');
    this.end.set(undefined);
    this.failure.set(undefined);
    this.tried.set(false);
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

  protected setPages(value: string): void {
    const pages = Number.parseInt(value, 10);
    this.pages.set(Number.isNaN(pages) ? 0 : Math.max(0, pages));
  }

  protected step(delta: number): void {
    this.pages.update((pages) => Math.max(0, pages + delta));
  }

  protected setEnd(kind: 'finished' | 'abandoned', checked: boolean): void {
    this.end.update((end) => (checked ? kind : end === kind ? undefined : end));
  }

  /**
   * The session goes to the reading in progress of the book, or to the latest one taken up again
   * when it was abandoned; then the reading ends on the day, when the reader said so.
   */
  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.tried.set(true);
    const bookId = this.chosen();
    if (this.problem() || bookId === undefined) {
      return;
    }
    this.busy.set(true);
    this.failure.set(undefined);
    try {
      const readings = await firstValueFrom(this.readingApi.readings(bookId));
      let reading = readings.find((one) => one.status === 'IN_PROGRESS');
      if (!reading && readings[0]?.status === 'ABANDONED') {
        reading = await firstValueFrom(this.readingApi.resumeReading(readings[0].id));
      }
      if (!reading) {
        this.failure.set('Este livro não tem uma leitura para continuar.');
        return;
      }
      const date = this.date();
      if (this.pages() > 0) {
        await firstValueFrom(
          this.readingApi.addSession(reading.id, {
            date,
            pagesRead: this.pages(),
            note: this.note().trim() || undefined,
          }),
        );
      }
      if (this.end() === 'finished') {
        await firstValueFrom(this.readingApi.finishReading(reading.id, date));
      } else if (this.end() === 'abandoned') {
        await firstValueFrom(this.readingApi.abandonReading(reading.id, date));
      }
      const title = this.books.value()?.content.find((book) => book.id === bookId)?.title ?? '';
      this.saved.emit({ date, title, pages: this.pages() });
      this.close();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.busy.set(false);
    }
  }
}
