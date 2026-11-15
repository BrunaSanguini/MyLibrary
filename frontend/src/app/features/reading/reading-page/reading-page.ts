import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FieldTree, form, FormField, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { BookDetailResponse, BooksApi } from '@core/api/books-api';
import { toId } from '@core/api/query-params';
import { ReadingApi, ReadingResponse, ReadingStatus, SessionResponse } from '@core/api/reading-api';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { formatLongDate, formatShortDate, TODAY } from '@core/time/today';
import { Button } from '@shared/ui/button/button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { firstValueFrom } from 'rxjs';

import { ReadingProgress } from '../reading-progress/reading-progress';
import { SessionForm } from '../session-form/session-form';

/** A reading being registered: one that starts now or one that is already over. */
interface NewReadingModel {
  status: ReadingStatus;
  startDate: string;
  endDate: string;
  reread: boolean;
}

/** The dates of the reading in progress, and the day it ends when it is finished or abandoned. */
interface PeriodModel {
  startDate: string;
  reread: boolean;
  endDate: string;
}

/**
 * Registrar leitura: follows the reading in progress of a book, one session at a time.
 *
 * <p>Without a reading in progress, the page offers to start one or to register one that is
 * already over. With one, it shows the progress, takes the sessions, and lets the reader correct
 * the period, finish or abandon. After every change the reading and its sessions are fetched
 * again, so the ring, the week, the chart and the forecast always show what is saved.
 */
@Component({
  selector: 'ml-reading-page',
  imports: [
    Button,
    EmptyState,
    ErrorState,
    FormField,
    Icon,
    ReadingProgress,
    RouterLink,
    SessionForm,
    Skeleton,
  ],
  templateUrl: './reading-page.html',
  styleUrls: ['../reading-fields.css', './reading-page.css'],
})
export default class ReadingPage implements HasUnsavedChanges {
  readonly id = input(undefined, { transform: toId });

  private readonly router = inject(Router);
  private readonly booksApi = inject(BooksApi);
  private readonly readingApi = inject(ReadingApi);
  private readonly todayOf = inject(TODAY);
  private readonly sessionForm = viewChild(SessionForm);

  protected readonly today = computed(() => this.todayOf());

  protected readonly book = httpResource<BookDetailResponse>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.booksApi.detailRequest(id);
  });

  protected readonly readings = httpResource<ReadingResponse[]>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.readingApi.readingsRequest(id);
  });

  /** A book has at most one reading in progress, and the API lists it first. */
  protected readonly current = computed(() =>
    this.readings.hasValue()
      ? this.readings.value().find((reading) => reading.status === 'IN_PROGRESS')
      : undefined,
  );

  private readonly currentId = computed(() => this.current()?.id);

  protected readonly sessions = httpResource<SessionResponse[]>(() => {
    const readingId = this.currentId();
    return readingId === undefined ? undefined : this.readingApi.sessionsRequest(readingId);
  });

  /** Kept while the sessions are fetched again, so the charts do not blink on every save. */
  private readonly lastSessions = signal<readonly SessionResponse[]>([]);
  protected readonly sessionList = computed(() => this.lastSessions());
  protected readonly latestSessions = computed(() =>
    [...this.lastSessions()].reverse().map((session) => ({
      ...session,
      day: formatShortDate(session.date),
      pages: session.pagesRead === 1 ? '1 página' : `${session.pagesRead} páginas`,
    })),
  );

  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly notice = signal<string | undefined>(undefined);
  protected readonly busy = signal(false);

  private readonly error = computed(() => {
    const error: unknown = this.book.error() ?? this.readings.error();
    return error === undefined ? undefined : ApiError.from(error);
  });

  protected readonly notFound = computed(
    () => this.id() === undefined || this.error()?.code === 'book.not-found',
  );
  protected readonly errorMessage = computed(() => this.error()?.detail);

  /** Someone who already finished the book once is most likely rereading it. */
  private readonly readBefore = computed(
    () =>
      this.readings.hasValue() &&
      this.readings.value().some((reading) => reading.status === 'FINISHED'),
  );

  protected readonly startedOn = computed(() => {
    const start = this.current()?.startDate;
    return start ? formatLongDate(start) : undefined;
  });

  protected readonly newReadingModel = signal<NewReadingModel>({
    status: 'IN_PROGRESS',
    startDate: '',
    endDate: '',
    reread: false,
  });

  protected readonly newReadingForm = form(this.newReadingModel, (reading) => {
    validate(reading.startDate, ({ value, valueOf }) => {
      if (valueOf(reading.status) === 'IN_PROGRESS' && value() === '') {
        return { kind: 'required', message: 'Informe quando você começou a ler.' };
      }
      return value() > this.today()
        ? { kind: 'future', message: 'O início não pode ser no futuro.' }
        : undefined;
    });
    validate(reading.endDate, ({ value, valueOf }) => {
      if (valueOf(reading.status) === 'IN_PROGRESS') {
        return undefined;
      }
      if (value() === '') {
        return { kind: 'required', message: 'Informe quando a leitura terminou.' };
      }
      if (value() > this.today()) {
        return { kind: 'future', message: 'O fim não pode ser no futuro.' };
      }
      const start = valueOf(reading.startDate);
      return start !== '' && value() < start
        ? { kind: 'order', message: 'O fim não pode ser antes do início.' }
        : undefined;
    });
  });

  protected readonly startingNow = computed(() => this.newReadingModel().status === 'IN_PROGRESS');

  protected readonly periodModel = signal<PeriodModel>({
    startDate: '',
    reread: false,
    endDate: '',
  });

  protected readonly periodForm = form(this.periodModel, (period) => {
    required(period.startDate, { message: 'Informe quando você começou a ler.' });
    validate(period.startDate, ({ value }) =>
      value() > this.today()
        ? { kind: 'future', message: 'O início não pode ser no futuro.' }
        : undefined,
    );
    validate(period.endDate, ({ value, valueOf }) => {
      if (value() === '') {
        return { kind: 'required', message: 'Informe o dia do término.' };
      }
      if (value() > this.today()) {
        return { kind: 'future', message: 'O término não pode ser no futuro.' };
      }
      return value() < valueOf(period.startDate)
        ? { kind: 'order', message: 'O término não pode ser antes do início.' }
        : undefined;
    });
  });

  constructor() {
    effect(() => {
      if (this.sessions.hasValue()) {
        this.lastSessions.set(this.sessions.value());
      } else if (this.currentId() === undefined) {
        this.lastSessions.set([]);
      }
    });

    // A new reading starts today by default, and as a reread for a book already finished.
    effect(() => {
      const today = this.today();
      const reread = this.readBefore();
      this.newReadingModel.update((model) => ({
        ...model,
        startDate: model.startDate || today,
        reread,
      }));
    });

    // The period form follows the saved reading, and ends today unless the reader says otherwise.
    effect(() => {
      const current = this.current();
      if (current) {
        this.periodModel.set({
          startDate: current.startDate ?? '',
          reread: current.reread,
          endDate: this.today(),
        });
        this.periodForm().reset();
      }
    });
  }

  /** A session being typed is what this page can lose. */
  hasUnsavedChanges(): boolean {
    return this.sessionForm()?.hasUnsavedChanges() ?? false;
  }

  /** First message of a field, once the user has been there or tried to save. */
  protected errorOf(field: FieldTree<unknown>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }

  /** After a session, the reading (progress) and its sessions are both out of date. */
  protected refresh(): void {
    this.readings.reload();
    this.sessions.reload();
  }

  protected async createReading(event: Event): Promise<void> {
    event.preventDefault();
    const bookId = this.id();
    if (bookId === undefined) {
      return;
    }
    await submit(this.newReadingForm, async () => {
      const { status, startDate, endDate, reread } = this.newReadingModel();
      const inProgress = status === 'IN_PROGRESS';
      await this.send(async () => {
        await firstValueFrom(
          this.readingApi.createReading(bookId, {
            status,
            startDate: startDate || undefined,
            endDate: inProgress ? undefined : endDate,
            reread,
          }),
        );
        if (inProgress) {
          this.readings.reload();
        } else {
          // A reading that is already over has nothing to follow here.
          await this.router.navigate(['/livros', bookId]);
        }
      });
      return undefined;
    });
  }

  protected async savePeriod(event: Event, reading: ReadingResponse): Promise<void> {
    event.preventDefault();
    const startField = this.periodForm.startDate();
    startField.markAsTouched();
    if (startField.invalid()) {
      return;
    }
    const { startDate, reread } = this.periodModel();
    await this.send(async () => {
      await firstValueFrom(this.readingApi.updateReading(reading.id, { startDate, reread }));
      this.notice.set('Período da leitura atualizado.');
      this.readings.reload();
    });
  }

  protected finish(reading: ReadingResponse): Promise<void> {
    return this.close(reading, (endDate) => this.readingApi.finishReading(reading.id, endDate));
  }

  protected abandon(reading: ReadingResponse): Promise<void> {
    return this.close(reading, (endDate) => this.readingApi.abandonReading(reading.id, endDate));
  }

  protected async deleteSession(reading: ReadingResponse, session: SessionResponse): Promise<void> {
    await this.send(async () => {
      await firstValueFrom(this.readingApi.deleteSession(reading.id, session.id));
      this.notice.set('Sessão excluída.');
      this.refresh();
    });
  }

  /** Finishing and abandoning differ only in the request; both end on the page of the book. */
  private async close(
    reading: ReadingResponse,
    request: (endDate: string) => ReturnType<ReadingApi['finishReading']>,
  ): Promise<void> {
    const endField = this.periodForm.endDate();
    endField.markAsTouched();
    if (endField.invalid()) {
      return;
    }
    await this.send(async () => {
      await firstValueFrom(request(this.periodModel().endDate));
      await this.router.navigate(['/livros', reading.bookId]);
    });
  }

  private async send(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.failure.set(undefined);
    this.notice.set(undefined);
    try {
      await action();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.busy.set(false);
    }
  }
}
