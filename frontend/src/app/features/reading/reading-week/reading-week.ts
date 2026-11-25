import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionResponse } from '@core/api/reading-api';
import {
  addDays,
  daysBetween,
  formatDayMonth,
  formatWeekday,
  IsoDate,
  parseIsoDate,
} from '@core/time/today';
import { toRoman } from '@shared/format/roman';
import { Icon } from '@shared/ui/icon/icon';

import { currentStreak, dailyPages, pagesOn, weekAverage } from '../reading-stats';

const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

function pagesText(pages: number): string {
  return pages === 1 ? '1 página' : `${pages} páginas`;
}

/**
 * Semana e KPIs (spec R.4): the seven days of a week, each one a button that picks the day of the
 * session, and three numbers: the pages of the day picked, the days in a row and the days with
 * the book. The arrows walk the weeks, never past the current one.
 */
@Component({
  selector: 'ml-reading-week',
  imports: [Icon, RouterLink],
  templateUrl: './reading-week.html',
  styleUrl: './reading-week.css',
})
export class ReadingWeek {
  readonly sessions = input.required<readonly SessionResponse[]>();
  /** Monday of the week shown. */
  readonly monday = input.required<IsoDate>();
  readonly selected = input.required<IsoDate>();
  readonly today = input.required<IsoDate>();
  readonly startDate = input<IsoDate | undefined>();

  readonly selectedChange = output<IsoDate>();
  readonly mondayChange = output<IsoDate>();

  protected readonly days = computed(() =>
    dailyPages(this.sessions(), this.monday(), addDays(this.monday(), 6)).map((day) => {
      const start = this.startDate();
      const disabled = day.date > this.today() || (start !== undefined && day.date < start);
      return {
        ...day,
        number: parseIsoDate(day.date).getDate(),
        weekday: capitalize(formatWeekday(day.date)),
        disabled,
        label: `${capitalize(formatWeekday(day.date))} ${parseIsoDate(day.date).getDate()} de ${MONTH.format(
          parseIsoDate(day.date),
        )}, ${pagesText(day.pages)}`,
      };
    }),
  );

  /** `Novembro de MMXXVI`, the month of the Monday shown. */
  protected readonly month = computed(() => {
    const date = parseIsoDate(this.monday());
    return `${capitalize(MONTH.format(date))} de ${toRoman(date.getFullYear())}`;
  });

  protected readonly average = computed(() =>
    weekAverage(this.days(), this.today(), this.startDate()),
  );

  /** `110 páginas nesta semana · média de 28 por dia`. */
  protected readonly summary = computed(() => {
    const total = this.days().reduce((sum, day) => sum + day.pages, 0);
    return `${pagesText(total)} nesta semana · média de ${this.average()} por dia`;
  });

  protected readonly canGoForward = computed(() => addDays(this.monday(), 7) <= this.today());

  protected readonly kpis = computed(() => {
    const selected = this.selected();
    const pages = pagesOn(this.sessions(), selected);
    const streak = currentStreak(this.sessions(), this.today());
    const start = this.startDate();
    const withBook = start ? Math.max(1, daysBetween(start, this.today()) + 1) : 0;
    return [
      {
        value: pages,
        unit: pages === 1 ? 'pág' : 'págs',
        label: `em ${formatWeekday(selected)}, ${formatDayMonth(selected)}`,
      },
      { value: streak, unit: streak === 1 ? 'dia' : 'dias', label: 'lendo sem parar' },
      { value: withBook, unit: withBook === 1 ? 'dia' : 'dias', label: 'com este livro' },
    ];
  });

  protected step(weeks: number): void {
    this.mondayChange.emit(addDays(this.monday(), weeks * 7));
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
