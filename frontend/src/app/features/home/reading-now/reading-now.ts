import { httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReadingApi, ReadingResponse, SessionResponse } from '@core/api/reading-api';
import { ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { formatNumericDate } from '@core/time/today';
import { toRoman } from '@shared/format/roman';
import { Button } from '@shared/ui/button/button';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Icon } from '@shared/ui/icon/icon';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';

/**
 * Lendo agora: the books in progress, one at a time, with how far each one is, how many notes
 * the reading has and the way to register the pages read today.
 */
@Component({
  selector: 'ml-reading-now',
  imports: [BookCover, Button, Icon, ProgressBar, RouterLink],
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
      reading?.startDate ? `começou em ${formatNumericDate(reading.startDate)}` : undefined,
    ];
    return parts.filter(Boolean).join(' · ');
  });

  /** The note of a session is a note of the book: the ones the reading has so far. */
  private readonly sessions = httpResource<SessionResponse[]>(() => {
    const reading = this.reading();
    return reading ? this.readingApi.sessionsRequest(reading.id) : undefined;
  });

  protected readonly notes = computed(() => {
    if (!this.sessions.hasValue()) {
      return undefined;
    }
    const count = this.sessions.value().filter((session) => session.note?.trim()).length;
    if (count === 0) {
      return 'Nenhuma nota registrada';
    }
    return count === 1 ? '1 nota registrada' : `${count} notas registradas`;
  });

  protected readonly position = computed(
    () => `${toRoman(this.index() + 1)} / ${toRoman(this.books().length)}`,
  );

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
