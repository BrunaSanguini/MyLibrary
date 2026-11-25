import { Component, computed, input, signal } from '@angular/core';
import { SessionResponse } from '@core/api/reading-api';
import { addDays, formatWeekday, IsoDate, parseIsoDate } from '@core/time/today';

import { dailyPages } from '../reading-stats';

/** The scale never goes below this many pages, so a weak week does not look like a full one. */
const MIN_SCALE = 60;
const MONTH_DAYS = 30;

/**
 * Páginas por dia (spec R.5): the week shown, or the last 30 days, as bars over a dashed line at
 * the average. The day picked in the week is lit.
 */
@Component({
  selector: 'ml-pages-chart',
  templateUrl: './pages-chart.html',
  styleUrl: './pages-chart.css',
})
export class PagesChart {
  readonly sessions = input.required<readonly SessionResponse[]>();
  readonly monday = input.required<IsoDate>();
  readonly selected = input.required<IsoDate>();
  readonly today = input.required<IsoDate>();

  protected readonly period = signal<'semana' | 'mes'>('semana');

  private readonly days = computed(() =>
    this.period() === 'semana'
      ? dailyPages(this.sessions(), this.monday(), addDays(this.monday(), 6))
      : dailyPages(this.sessions(), addDays(this.today(), -(MONTH_DAYS - 1)), this.today()),
  );

  private readonly read = computed(() => this.days().filter((day) => day.pages > 0));

  /** `110 páginas` and `4 dias de leitura`, only the days with pages. */
  protected readonly totals = computed(() => {
    const pages = this.read().reduce((sum, day) => sum + day.pages, 0);
    const days = this.read().length;
    return {
      pages: pages.toLocaleString('pt-BR'),
      pagesLabel: pages === 1 ? 'página' : 'páginas',
      days,
      daysLabel: days === 1 ? 'dia de leitura' : 'dias de leitura',
    };
  });

  private readonly scale = computed(() =>
    Math.max(MIN_SCALE, ...this.days().map((day) => day.pages)),
  );

  protected readonly average = computed(() => {
    const read = this.read();
    return read.length === 0
      ? 0
      : Math.round(read.reduce((sum, day) => sum + day.pages, 0) / read.length);
  });

  protected readonly averageAt = computed(() => (this.average() / this.scale()) * 100);

  protected readonly bars = computed(() => {
    const week = this.period() === 'semana';
    return this.days().map((day, index) => ({
      ...day,
      height: (day.pages / this.scale()) * 100,
      lit: day.date === this.selected(),
      axis: week
        ? capitalize(formatWeekday(day.date))
        : index % 5 === 0
          ? String(parseIsoDate(day.date).getDate())
          : '',
    }));
  });

  protected readonly label = computed(
    () =>
      `Páginas lidas por dia: ${this.days()
        .map((day) => day.pages)
        .join(', ')}`,
  );

  protected choose(period: 'semana' | 'mes'): void {
    this.period.set(period);
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
