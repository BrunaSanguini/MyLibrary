import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ReadingApi, ReadingResponse, SessionResponse } from '@core/api/reading-api';
import { formatNumericDate } from '@core/time/today';
import { forkJoin, of } from 'rxjs';

interface Note {
  readonly id: number;
  readonly label: string;
  readonly text: string;
}

/**
 * Minhas notas: what the reader wrote while reading, from the sessions of every reading, the
 * oldest first so they follow the book. The "+" leads to Registrar leitura, where a note is written
 * with its session.
 */
@Component({
  selector: 'ml-book-notes',
  imports: [RouterLink],
  templateUrl: './book-notes.html',
  styleUrl: './book-notes.css',
})
export class BookNotes {
  readonly bookId = input.required<number>();
  readonly readings = input.required<readonly ReadingResponse[]>();

  private readonly readingApi = inject(ReadingApi);

  /** Only the readings with sessions are asked for. */
  private readonly sessions = rxResource({
    params: () => this.readings().filter((reading) => reading.sessionCount > 0),
    stream: ({ params }) =>
      params.length === 0
        ? of([] as SessionResponse[][])
        : forkJoin(params.map((reading) => this.readingApi.sessions(reading.id))),
  });

  protected readonly notes = computed<readonly Note[]>(() =>
    (this.sessions.value() ?? [])
      .flat()
      .filter((session) => (session.note ?? '').trim() !== '')
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
      .map((session) => ({
        id: session.id,
        label: formatNumericDate(session.date),
        text: session.note!.trim(),
      })),
  );
}
