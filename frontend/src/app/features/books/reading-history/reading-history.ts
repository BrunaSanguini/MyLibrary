import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReadingApi, ReadingResponse, ReadingStatus, SessionResponse } from '@core/api/reading-api';
import { daysBetween, formatLongDate, formatShortDate, TODAY } from '@core/time/today';
import { Button } from '@shared/ui/button/button';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';
import { Tag } from '@shared/ui/tag/tag';

const STATUS_LABELS: Readonly<Record<ReadingStatus, string>> = {
  IN_PROGRESS: 'Lendo',
  FINISHED: 'Lida',
  ABANDONED: 'Abandonada',
};

/**
 * One reading of the book in the history: the period, how far it went and, on demand, its
 * sessions. The sessions are fetched only when opened, as most readers look at one or two.
 */
@Component({
  selector: 'ml-reading-entry',
  imports: [Button, ProgressBar, Tag],
  templateUrl: './reading-entry.html',
  styleUrl: './reading-history.css',
})
export class ReadingEntry {
  readonly reading = input.required<ReadingResponse>();
  /** 1 for the first time the book was read. */
  readonly number = input.required<number>();

  private readonly readingApi = inject(ReadingApi);
  private readonly today = inject(TODAY);

  protected readonly open = signal(false);
  protected readonly sessions = httpResource<SessionResponse[]>(() =>
    this.open() ? this.readingApi.sessionsRequest(this.reading().id) : undefined,
  );
  protected readonly sessionsId = computed(() => `sessoes-leitura-${this.reading().id}`);

  protected readonly title = computed(() => `${this.number()}ª leitura`);
  protected readonly statusLabel = computed(() => STATUS_LABELS[this.reading().status]);

  protected readonly period = computed(() => {
    const { startDate, endDate, status } = this.reading();
    if (!startDate) {
      return undefined;
    }
    const start = formatLongDate(startDate);
    if (endDate) {
      return `De ${start} a ${formatLongDate(endDate)}`;
    }
    return status === 'IN_PROGRESS' ? `Desde ${start}` : `Começou em ${start}`;
  });

  /** Counting both ends: a book started and finished on the same day took 1 day. */
  protected readonly days = computed(() => {
    const { startDate, endDate, status } = this.reading();
    const end = endDate ?? (status === 'IN_PROGRESS' ? this.today() : undefined);
    if (!startDate || !end) {
      return undefined;
    }
    const days = daysBetween(startDate, end) + 1;
    return days === 1 ? '1 dia' : `${days.toLocaleString('pt-BR')} dias`;
  });

  protected readonly pages = computed(() => {
    const { pagesRead, pageCount } = this.reading().progress;
    const read = pagesRead.toLocaleString('pt-BR');
    return pageCount
      ? `${read} de ${pageCount.toLocaleString('pt-BR')} páginas`
      : `${read} páginas`;
  });

  protected readonly sessionCount = computed(() => {
    const count = this.reading().sessionCount;
    return count === 1 ? '1 sessão' : `${count.toLocaleString('pt-BR')} sessões`;
  });

  protected dateOf(session: SessionResponse): string {
    return formatShortDate(session.date);
  }

  protected toggle(): void {
    this.open.update((open) => !open);
  }
}

/**
 * Histórico de leitura: every reading of the book, the latest first, as the API lists them.
 */
@Component({
  selector: 'ml-reading-history',
  imports: [Button, ReadingEntry, RouterLink],
  templateUrl: './reading-history.html',
  styleUrl: './reading-history.css',
})
export class ReadingHistory {
  readonly bookId = input.required<number>();
  readonly readings = input.required<readonly ReadingResponse[]>();
}
