import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookDetailResponse } from '@core/api/books-api';
import { BOOK_STATUS_LABELS, bookStatusOf, ReadingResponse } from '@core/api/reading-api';
import { formatLongDate } from '@core/time/today';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';
import { RatingStars } from '@shared/ui/rating-stars/rating-stars';
import { Tag } from '@shared/ui/tag/tag';

/**
 * The reading record of a book: rating, status, when it was read, how far the current reading
 * went and how many times it was read. Everything comes from the readings and the review, so the
 * record only shows; the readings are registered on their own page.
 */
@Component({
  selector: 'ml-reading-sheet',
  imports: [Button, Icon, ProgressBar, RatingStars, RouterLink, Tag],
  templateUrl: './reading-sheet.html',
  styleUrl: './reading-sheet.css',
})
export class ReadingSheet {
  readonly book = input.required<BookDetailResponse>();
  /** As the API lists them: the one in progress first, then from the latest to the oldest. */
  readonly readings = input.required<readonly ReadingResponse[]>();
  /** Rating of the review, when the book has one. */
  readonly rating = input<number | undefined>();

  /** The reading that decides the status, which is also the one whose dates the record shows. */
  protected readonly latest = computed(() => this.readings()[0]);
  protected readonly status = computed(() => bookStatusOf(this.readings()));
  protected readonly statusLabel = computed(() => BOOK_STATUS_LABELS[this.status()]);
  protected readonly reading = computed(() => this.status() === 'READING');

  protected readonly startDate = computed(() => {
    const start = this.latest()?.startDate;
    return start ? formatLongDate(start) : undefined;
  });

  protected readonly endDate = computed(() => {
    const end = this.latest()?.endDate;
    return end ? formatLongDate(end) : undefined;
  });

  /** "120 de 576" while reading; otherwise just the size of the book. */
  protected readonly pages = computed(() => {
    const total = this.book().pageCount;
    const latest = this.latest();
    if (this.reading() && latest) {
      const read = latest.progress.pagesRead.toLocaleString('pt-BR');
      return total ? `${read} de ${total.toLocaleString('pt-BR')}` : read;
    }
    return total?.toLocaleString('pt-BR');
  });

  protected readonly timesRead = computed(
    () => this.readings().filter((reading) => reading.status === 'FINISHED').length,
  );

  /** Read more than once, or a reading the person marked as a reread. */
  protected readonly reread = computed(
    () => this.timesRead() > 1 || this.readings().some((reading) => reading.reread),
  );

  protected readonly seriesPlace = computed(() => {
    const series = this.book().series;
    if (!series) {
      return undefined;
    }
    const position = series.position.toLocaleString('pt-BR');
    return series.totalVolumes
      ? `Livro ${position} de ${series.totalVolumes}`
      : `Livro ${position}`;
  });

  protected readonly action = computed(() => {
    switch (this.status()) {
      case 'READING':
        return 'Continuar leitura';
      case 'WANT_TO_READ':
        return 'Começar a ler';
      default:
        return 'Registrar leitura';
    }
  });
}
