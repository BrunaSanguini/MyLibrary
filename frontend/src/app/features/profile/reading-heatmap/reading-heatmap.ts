import { Component, computed, input } from '@angular/core';
import { DailyPages } from '@core/api/stats-api';
import { formatLongDate, IsoDate } from '@core/time/today';

import { formatNumber, HEAT_LEVELS, heatWeeks, monthSummaries, plural } from '../profile-stats';

/**
 * The last six months, one square per day, darker on the days with more pages.
 *
 * <p>The squares are only seen: screen readers get a table with the days and pages of each month,
 * which says the same thing in a form that can be read.
 */
@Component({
  selector: 'ml-reading-heatmap',
  templateUrl: './reading-heatmap.html',
  styleUrl: './reading-heatmap.css',
})
export class ReadingHeatmap {
  readonly today = input.required<IsoDate>();
  readonly days = input.required<readonly DailyPages[]>();
  readonly longestStreak = input.required<number>();

  protected readonly weeks = computed(() => heatWeeks(this.today(), this.days()));
  protected readonly months = computed(() => monthSummaries(this.days()));
  protected readonly levels = Array.from({ length: HEAT_LEVELS + 1 }, (_, level) => level);

  protected readonly summary = computed(
    () =>
      `${plural(this.days().length, 'dia com livro aberto', 'dias com livro aberto')} · maior sequência de ${plural(this.longestStreak(), 'dia', 'dias')}`,
  );

  protected readonly formatNumber = formatNumber;

  protected titleOf(date: IsoDate, pages: number): string {
    const day = formatLongDate(date);
    return pages === 0 ? `${day}: sem leitura` : `${day}: ${plural(pages, 'página', 'páginas')}`;
  }
}
