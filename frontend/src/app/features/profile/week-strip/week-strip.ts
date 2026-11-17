import { Component, computed, input } from '@angular/core';
import { DailyPages } from '@core/api/stats-api';
import { formatLongWeekday, IsoDate } from '@core/time/today';

import { plural, weekOf } from '../profile-stats';

/** Esta semana: Monday to Sunday, a spine for each day with reading. */
@Component({
  selector: 'ml-week-strip',
  templateUrl: './week-strip.html',
  styleUrl: './week-strip.css',
})
export class WeekStrip {
  readonly today = input.required<IsoDate>();
  readonly days = input.required<readonly DailyPages[]>();

  protected readonly week = computed(() => weekOf(this.today(), this.days()));
  protected readonly summary = computed(() => {
    const read = this.week().filter((day) => day.pages > 0);
    const pages = read.reduce((total, day) => total + day.pages, 0);
    return read.length === 0
      ? 'Nenhum dia com livro aberto ainda'
      : `${plural(read.length, 'dia com livro aberto', 'dias com livro aberto')} · ${plural(pages, 'página', 'páginas')}`;
  });

  protected describe(date: IsoDate, pages: number, future: boolean): string {
    const day = formatLongWeekday(date);
    if (future) {
      return `${day}: ainda não chegou`;
    }
    return pages === 0 ? `${day}: sem leitura` : `${day}: ${plural(pages, 'página', 'páginas')}`;
  }
}
