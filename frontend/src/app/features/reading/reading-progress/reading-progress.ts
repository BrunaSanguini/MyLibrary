import { Component, computed, input } from '@angular/core';
import { ReadingResponse, SessionResponse } from '@core/api/reading-api';
import {
  addDays,
  formatLongDate,
  formatLongWeekday,
  formatShortDate,
  formatWeekday,
  IsoDate,
  parseIsoDate,
} from '@core/time/today';
import { ProgressRing } from '@shared/ui/progress-ring/progress-ring';

import { dailyPages, forecastOf, weekOf } from '../reading-stats';

const CHART_DAYS = 14;

function pagesText(pages: number): string {
  return pages === 1 ? '1 página' : `${pages.toLocaleString('pt-BR')} páginas`;
}

/**
 * How a reading is going: the ring with the progress, the forecast of the end, the week and the
 * pages of each of the last days.
 *
 * <p>Everything is calculated here from the reading and its sessions, so saving a session only
 * has to hand the new data in for the four of them to change together.
 */
@Component({
  selector: 'ml-reading-progress',
  imports: [ProgressRing],
  templateUrl: './reading-progress.html',
  styleUrl: './reading-progress.css',
})
export class ReadingProgress {
  readonly reading = input.required<ReadingResponse>();
  readonly sessions = input.required<readonly SessionResponse[]>();
  readonly today = input.required<IsoDate>();

  protected readonly progress = computed(() => this.reading().progress);

  protected readonly pages = computed(() => {
    const { pagesRead, pageCount } = this.progress();
    const read = pagesRead.toLocaleString('pt-BR');
    return pageCount
      ? `${read} de ${pageCount.toLocaleString('pt-BR')} páginas`
      : pagesText(pagesRead);
  });

  private readonly forecast = computed(() =>
    forecastOf(
      this.progress().pagesRead,
      this.progress().pageCount ?? undefined,
      this.reading().startDate ?? undefined,
      this.today(),
    ),
  );

  protected readonly forecastDate = computed(() => {
    const forecast = this.forecast();
    return forecast ? formatLongDate(forecast.endDate) : undefined;
  });

  protected readonly forecastDetail = computed(() => {
    const forecast = this.forecast();
    if (forecast) {
      const pace = forecast.pagesPerDay.toLocaleString('pt-BR');
      return `No ritmo de ${pace} páginas por dia, faltam ${pagesText(forecast.pagesLeft)}.`;
    }
    const { pagesRead, pageCount } = this.progress();
    if (!pageCount) {
      return 'Sem o número de páginas do livro, não há como prever o fim.';
    }
    return pagesRead >= pageCount
      ? 'Você chegou à última página. É só concluir a leitura.'
      : 'A previsão aparece depois da primeira sessão.';
  });

  protected readonly week = computed(() =>
    weekOf(this.sessions(), this.today()).map((day) => ({
      ...day,
      weekday: formatWeekday(day.date),
      dayOfMonth: parseIsoDate(day.date).getDate(),
      today: day.date === this.today(),
      label: `${formatLongWeekday(day.date)}, ${formatShortDate(day.date)}: ${
        day.pages > 0 ? pagesText(day.pages) : 'sem leitura'
      }`,
    })),
  );

  protected readonly weekTotal = computed(() =>
    pagesText(this.week().reduce((total, day) => total + day.pages, 0)),
  );

  /** The last two weeks, each bar as a share of the best day. */
  protected readonly chart = computed(() => {
    const days = dailyPages(this.sessions(), addDays(this.today(), 1 - CHART_DAYS), this.today());
    const best = Math.max(1, ...days.map((day) => day.pages));
    return days.map((day) => ({
      ...day,
      dayOfMonth: parseIsoDate(day.date).getDate(),
      height: Math.round((day.pages / best) * 100),
      label: `${formatShortDate(day.date)}: ${day.pages > 0 ? pagesText(day.pages) : 'sem leitura'}`,
    }));
  });
}
