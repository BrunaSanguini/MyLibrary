import { Component, computed, input } from '@angular/core';
import { BookDetailResponse } from '@core/api/books-api';
import { BOOK_STATUS_LABELS, bookStatusOf, ReadingResponse } from '@core/api/reading-api';
import { formatNumericDate } from '@core/time/today';
import { toRoman } from '@shared/format/roman';

/** The volumes the series line draws, at most: beyond that the dashes would not fit. */
const MAX_DASHES = 12;

/**
 * Ficha de leitura: the rating, then the series, the status, the dates and pages of the latest
 * reading and how many times the book was read. Dark in both themes, like a library card.
 *
 * <p>Everything comes from the readings and the review: the ficha only shows. A book in the
 * wishlist has no reading status, so the status and the dates stay out.
 */
@Component({
  selector: 'ml-reading-sheet',
  templateUrl: './reading-sheet.html',
  styleUrl: './reading-sheet.css',
})
export class ReadingSheet {
  readonly book = input.required<BookDetailResponse>();
  /** As the API lists them: the one in progress first, then from the latest to the oldest. */
  readonly readings = input.required<readonly ReadingResponse[]>();
  /** Rating of the review, when the book has one. */
  readonly rating = input<number | undefined>();

  protected readonly wishlist = computed(() => this.book().ownership === 'WISHLIST');

  /** The reading that decides the status, which is also the one whose dates the ficha shows. */
  protected readonly latest = computed(() => this.readings()[0]);
  protected readonly status = computed(() => bookStatusOf(this.readings()));
  protected readonly statusLabel = computed(() =>
    this.status() === 'READING' ? 'Lendo agora' : BOOK_STATUS_LABELS[this.status()],
  );

  /** `4,5`, or a dash when there is no rating. */
  protected readonly ratingText = computed(() => {
    const rating = this.rating();
    return rating === undefined ? '—' : rating.toLocaleString('pt-BR');
  });

  /** Five stars, full, half or empty, as the rating fills them. */
  protected readonly stars = computed(() => {
    const rating = this.rating() ?? 0;
    return [1, 2, 3, 4, 5].map((star) =>
      rating >= star ? 'full' : rating >= star - 0.5 ? 'half' : 'empty',
    );
  });

  protected readonly starsLabel = computed(() => {
    const rating = this.rating();
    return rating === undefined ? 'Sem nota' : `Nota ${this.ratingText()} de 5`;
  });

  /** `O Senhor dos Anéis · livro I de III`, and one dash per volume, this one lit. */
  protected readonly series = computed(() => {
    const series = this.book().series;
    if (!series) {
      return undefined;
    }
    const at = series.position;
    const total = series.totalVolumes;
    if (at === undefined) {
      // In the series without a position: the series, and how many volumes it has.
      const text = total ? `${series.name} · ${toRoman(total)} livros` : series.name;
      return { text, dashes: [] };
    }
    const position = Number.isInteger(at) ? toRoman(at) : at.toLocaleString('pt-BR');
    const text = total
      ? `${series.name} · livro ${position} de ${toRoman(total)}`
      : `${series.name} · livro ${position}`;
    const dashes =
      total && total <= MAX_DASHES
        ? Array.from({ length: total }, (_, index) => index + 1 === Math.round(at))
        : [];
    return { text, dashes };
  });

  protected readonly start = computed(() => {
    const start = this.latest()?.startDate;
    return start ? formatNumericDate(start) : '—';
  });

  /** The end of the latest reading, or "em andamento" while it is not over. */
  protected readonly end = computed(() => {
    const end = this.latest()?.endDate;
    return end ? formatNumericDate(end) : 'em andamento';
  });

  /** An abandoned book says where it stopped: `14/05/2026 · pág. 212 de 576`. */
  protected readonly stoppedAt = computed(() => {
    const latest = this.latest();
    if (!latest || this.status() !== 'ABANDONED') {
      return undefined;
    }
    const total = this.book().pageCount;
    const page = latest.progress.pagesRead;
    const where = total ? `pág. ${page} de ${total}` : `pág. ${page}`;
    return latest.endDate ? `${formatNumericDate(latest.endDate)} · ${where}` : where;
  });

  protected readonly pages = computed(() => this.book().pageCount?.toLocaleString('pt-BR') ?? '—');

  /** Every record of the history counts, in roman numerals. */
  protected readonly timesRead = computed(() => {
    const count = this.readings().length;
    return count === 0 ? '—' : toRoman(count);
  });

  protected readonly reread = computed(() => this.readings().length > 1);
}
