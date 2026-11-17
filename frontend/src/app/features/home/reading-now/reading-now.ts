import { httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReadingApi, ReadingResponse } from '@core/api/reading-api';
import { ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { formatLongDate } from '@core/time/today';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Icon } from '@shared/ui/icon/icon';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';

/**
 * Lendo agora: the books in progress, one at a time, with how far each one is and the way to
 * register the pages read today.
 */
@Component({
  selector: 'ml-reading-now',
  imports: [BookCover, Icon, ProgressBar, RouterLink],
  templateUrl: './reading-now.html',
  styleUrls: ['../home-section.css', './reading-now.css'],
})
export class ReadingNow {
  private readonly shelfApi = inject(ShelfApi);
  private readonly readingApi = inject(ReadingApi);

  protected readonly page = httpResource<ShelfPage>(() =>
    this.shelfApi.booksRequest({ status: ['READING'], sort: 'title', size: 20 }),
  );
  protected readonly books = computed(() => this.page.value()?.content ?? []);

  protected readonly index = linkedSignal({
    source: () => this.books().length,
    computation: () => 0,
  });
  protected readonly current = computed(() => this.books()[this.index()]);

  /** The reading in progress comes first in the list of the book. */
  private readonly readings = httpResource<ReadingResponse[]>(() => {
    const book = this.current();
    return book ? this.readingApi.readingsRequest(book.id) : undefined;
  });
  protected readonly reading = computed(() =>
    this.readings.value()?.find((reading) => reading.status === 'IN_PROGRESS'),
  );

  protected readonly details = computed(() => {
    const reading = this.reading();
    const pageCount = reading?.progress.pageCount ?? this.current()?.progress?.pageCount;
    const parts = [
      pageCount ? `${pageCount} páginas` : undefined,
      reading?.startDate ? `começou em ${formatLongDate(reading.startDate)}` : undefined,
    ];
    return parts.filter(Boolean).join(' · ');
  });

  protected readonly sessions = computed(() => {
    const count = this.reading()?.sessionCount ?? 0;
    if (count === 0) {
      return 'Nenhum dia registrado ainda';
    }
    return count === 1 ? '1 dia registrado' : `${count} dias registrados`;
  });

  protected readonly percent = computed(
    () => this.reading()?.progress.percent ?? this.current()?.progress?.percent ?? 0,
  );

  protected readonly pages = computed(() => {
    const progress = this.reading()?.progress;
    return progress?.pageCount
      ? `página ${progress.pagesRead} de ${progress.pageCount}`
      : undefined;
  });

  protected step(by: number): void {
    const total = this.books().length;
    this.index.update((index) => (index + by + total) % total);
  }
}
