import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReadingResponse } from '@core/api/reading-api';
import { TODAY } from '@core/time/today';
import { toRoman } from '@shared/format/roman';

import { journeyOf } from './journey';
import { ReadingEntry } from './reading-entry';

/**
 * Histórico de leitura: the summary in four numbers, then the readings on a timeline, the latest
 * first, as the API lists them, and the invitation to the next one. Only the latest reading opens
 * with its details; each card opens and closes on its own.
 */
@Component({
  selector: 'ml-reading-history',
  imports: [ReadingEntry, RouterLink],
  templateUrl: './reading-history.html',
  styleUrl: './reading-history.css',
})
export class ReadingHistory {
  readonly bookId = input.required<number>();
  readonly pageCount = input<number | undefined>();
  readonly readings = input.required<readonly ReadingResponse[]>();

  private readonly today = inject(TODAY);

  /** `II leituras · 69 dias com o livro · 17 páginas por dia`. */
  protected readonly summary = computed(() => {
    const journeys = this.readings().map((reading) =>
      journeyOf(reading, this.pageCount(), this.today()),
    );
    const days = journeys.reduce((total, journey) => total + (journey.days ?? 0), 0);
    const pages = journeys.reduce((total, journey) => total + journey.pages, 0);
    return {
      readings: toRoman(this.readings().length),
      days,
      perDay: days > 0 ? Math.round(pages / days) : 0,
    };
  });
}
