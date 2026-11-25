import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ReadingApi, ReadingResponse, ReadingStatus } from '@core/api/reading-api';
import { daysBetween, IsoDate, parseIsoDate, TODAY } from '@core/time/today';
import { toRoman } from '@shared/format/roman';
import { Icon } from '@shared/ui/icon/icon';
import { RatingStars } from '@shared/ui/rating-stars/rating-stars';

import { journeyOf } from './journey';

const SEALS: Readonly<Record<ReadingStatus, string>> = {
  IN_PROGRESS: 'Em andamento',
  FINISHED: 'Concluída',
  ABANDONED: 'Abandonada',
};

const DAY_MONTH = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' });

/** The tallest bar of the chart, in pixels; the others follow in proportion, never under 3. */
const BAR_HEIGHT = 80;
const MIN_BAR = 3;

/**
 * One reading on the timeline: the medal with its number, the dates, four numbers and, opened,
 * the pages of each week and the last note written during it.
 *
 * <p>The sessions are fetched only when the card opens; the latest reading opens by itself.
 */
@Component({
  selector: 'ml-reading-entry',
  imports: [Icon, RatingStars, RouterLink],
  templateUrl: './reading-entry.html',
  styleUrl: './reading-entry.css',
  host: { '[class.latest]': 'latest()' },
})
export class ReadingEntry {
  readonly bookId = input.required<number>();
  readonly pageCount = input<number | undefined>();
  readonly reading = input.required<ReadingResponse>();

  /** `5,0`, or `—` for a reading without a rating. */
  protected readonly ratingText = computed(() => {
    const rating = this.reading().rating;
    return rating == null
      ? '—'
      : rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  });
  /** 1 for the first time the book was read. */
  readonly number = input.required<number>();
  /** The latest reading comes open and with its medal lit. */
  readonly latest = input(false);

  private readonly readingApi = inject(ReadingApi);
  private readonly today = inject(TODAY);

  protected readonly open = linkedSignal(() => this.latest());

  protected readonly sessions = rxResource({
    params: () => (this.open() && this.reading().sessionCount > 0 ? this.reading().id : undefined),
    stream: ({ params }) => this.readingApi.sessions(params),
  });

  protected readonly detailsId = computed(() => `detalhes-leitura-${this.reading().id}`);
  protected readonly medal = computed(() => toRoman(this.number()));
  protected readonly title = computed(() =>
    this.number() === 1 ? 'Primeira leitura' : 'Releitura',
  );
  protected readonly seal = computed(() => SEALS[this.reading().status]);

  /** `10 de março → 16 de abril de 2026`, or `10 de março → hoje`. */
  protected readonly period = computed(() => {
    const { startDate, endDate, status } = this.reading();
    if (!startDate) {
      return undefined;
    }
    if (!endDate) {
      return status === 'IN_PROGRESS'
        ? `${DAY_MONTH_YEAR.format(parseIsoDate(startDate))} → hoje`
        : `Começou em ${DAY_MONTH_YEAR.format(parseIsoDate(startDate))}`;
    }
    const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
    const start = (sameYear ? DAY_MONTH : DAY_MONTH_YEAR).format(parseIsoDate(startDate));
    return `${start} → ${DAY_MONTH_YEAR.format(parseIsoDate(endDate))}`;
  });

  protected readonly stats = computed(() => {
    const journey = journeyOf(this.reading(), this.pageCount(), this.today());
    const sessions = this.reading().sessionCount;
    return [
      { value: journey.days ?? '—', label: journey.days === 1 ? 'dia' : 'dias' },
      { value: sessions, label: sessions === 1 ? 'sessão' : 'sessões' },
      { value: journey.perDay ?? '—', label: 'págs por dia' },
      { value: journey.pages, label: journey.pages === 1 ? 'página' : 'páginas' },
    ];
  });

  /** Pages of each week since the reading started: S1, S2… up to its end (or today). */
  protected readonly weeks = computed(() => {
    const { startDate, endDate } = this.reading();
    const sessions = this.sessions.value() ?? [];
    if (!startDate || sessions.length === 0) {
      return [];
    }
    const end: IsoDate = endDate ?? this.today();
    const count = Math.max(1, Math.floor(daysBetween(startDate, end) / 7) + 1);
    const pages = Array.from({ length: count }, () => 0);
    for (const session of sessions) {
      const week = Math.floor(daysBetween(startDate, session.date) / 7);
      if (week >= 0 && week < count) {
        pages[week]! += session.pagesRead;
      }
    }
    const most = Math.max(...pages);
    return pages.map((value, index) => ({
      label: `S${index + 1}`,
      value,
      height: most > 0 ? Math.max(MIN_BAR, Math.round((value / most) * BAR_HEIGHT)) : MIN_BAR,
      top: value > 0 && value === most,
    }));
  });

  protected readonly chartLabel = computed(
    () =>
      `Páginas lidas por semana: ${this.weeks()
        .map((week) => week.value)
        .join(', ')}`,
  );

  /** The last note written during this reading. */
  protected readonly quote = computed(() =>
    (this.sessions.value() ?? [])
      .filter((session) => (session.note ?? '').trim() !== '')
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
      .at(-1)
      ?.note?.trim(),
  );

  protected toggle(): void {
    this.open.update((open) => !open);
  }
}
