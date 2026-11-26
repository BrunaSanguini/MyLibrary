import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import {
  disabled,
  FieldTree,
  form,
  FormField,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { BookDetailResponse, BooksApi } from '@core/api/books-api';
import { ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { toId } from '@core/api/query-params';
import { ReadingApi, ReadingResponse, ReadingStatus, SessionResponse } from '@core/api/reading-api';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { addDays, formatShortDate, IsoDate, startOfWeek, TODAY } from '@core/time/today';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Button } from '@shared/ui/button/button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { firstValueFrom } from 'rxjs';

import { PagesChart } from '../pages-chart/pages-chart';
import { ReadingProgress } from '../reading-progress/reading-progress';
import { dailyPages, weekAverage } from '../reading-stats';
import { ReadingWeek } from '../reading-week/reading-week';
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
  finished: boolean;
  abandoned: boolean;
}

/** The status beside the author in the card of the book, as the period form says it now. */
const STATUS_WORDS = { reading: 'Lendo', read: 'Lido', reread: 'Relido', abandoned: 'Abandonado' };

/**
 * Registrar leitura (spec, screen 3): the diary of the reading of one book.
 *
 * <p>On the left, what the reading looks like (ring, week, numbers, chart); on the right, the
 * session of a day and the period of the reading. Picking a day in the week fills the day of the
 * session, and the other way round. A book can be changed in the selector, among the books being
 * read and the abandoned ones, which a new session takes up again. Without a reading to follow,
 * the page offers to start one or to register one that is already over. After every change the
 * reading and its sessions are fetched again, so every number shows what is saved.
 */
@Component({
  selector: 'ml-reading-page',
  imports: [
    BookCover,
    Button,
    EmptyState,
    ErrorState,
    FormField,
    Icon,
    PagesChart,
    ReadingProgress,
    ReadingWeek,
    RouterLink,
    SessionForm,
    Skeleton,
  ],
  templateUrl: './reading-page.html',
  styleUrls: ['../reading-fields.css', './reading-page.css'],
})
export default class ReadingPage implements HasUnsavedChanges {
  readonly id = input(undefined, { transform: toId });
  /** `?leitura=` from "Editar leitura" in the history: that reading, whatever its status. */
  readonly leitura = input(undefined, { transform: toId });

  private readonly router = inject(Router);
  private readonly booksApi = inject(BooksApi);
  private readonly shelfApi = inject(ShelfApi);
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

  /**
   * The reading the page follows: the one asked for in the address, or else the one in progress (a
   * book has at most one) or, without it, the latest one if it was abandoned, which a new session
   * takes up again.
   */
  protected readonly current = computed(() => {
    if (!this.readings.hasValue()) {
      return undefined;
    }
    const readings = this.readings.value();
    const asked = readings.find((reading) => reading.id === this.leitura());
    if (asked) {
      return asked;
    }
    const inProgress = readings.find((reading) => reading.status === 'IN_PROGRESS');
    return inProgress ?? (readings[0]?.status === 'ABANDONED' ? readings[0] : undefined);
  });

  protected readonly abandoned = computed(() => this.current()?.status === 'ABANDONED');
  /** A finished reading is edited, not ended again: only its dates and the reread mark change. */
  protected readonly finished = computed(() => this.current()?.status === 'FINISHED');

  /** The books the selector offers: being read, and abandoned ones that can be taken up again. */
  protected readonly choices = httpResource<ShelfPage>(() =>
    this.shelfApi.booksRequest({
      status: ['READING', 'ABANDONED'],
      wishlist: false,
      sort: 'title',
      size: 100,
    }),
  );

  protected readonly bookChoices = computed(() => {
    const listed = (this.choices.value()?.content ?? []).map(({ id, title }) => ({ id, title }));
    const book = this.book.value();
    return book && !listed.some((choice) => choice.id === book.id)
      ? [{ id: book.id, title: book.title }, ...listed]
      : listed;
  });

  /** The day picked in the week, which is also the day of the session. */
  protected readonly selectedDay = signal<IsoDate | undefined>(undefined);
  protected readonly day = computed(() => this.selectedDay() ?? this.today());
  /** Monday of the week shown. */
  protected readonly monday = signal<IsoDate | undefined>(undefined);
  protected readonly weekStart = computed(() => this.monday() ?? startOfWeek(this.today()));

  /** The pace of the forecast: the average of the week shown. */
  protected readonly average = computed(() =>
    weekAverage(
      dailyPages(this.sessionList(), this.weekStart(), addDays(this.weekStart(), 6)),
      this.today(),
      this.current()?.startDate ?? undefined,
    ),
  );

  /** `Patrick Rothfuss · Lendo`, with the status the period form says right now. */
  protected readonly bookLine = computed(() => {
    const book = this.book.value();
    const authors = book?.authors.map((author) => author.name).join(', ') ?? '';
    const { finished, abandoned, reread } = this.periodModel();
    const status = abandoned
      ? STATUS_WORDS.abandoned
      : finished
        ? reread
          ? STATUS_WORDS.reread
          : STATUS_WORDS.read
        : STATUS_WORDS.reading;
    return this.current() ? `${authors} · ${status}` : authors;
  });

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
    finished: false,
    abandoned: false,
  });

  protected readonly periodForm = form(this.periodModel, (period) => {
    required(period.startDate, { message: 'Informe quando você começou a ler.' });
    validate(period.startDate, ({ value }) =>
      value() > this.today()
        ? { kind: 'future', message: 'O início não pode ser no futuro.' }
        : undefined,
    );
    disabled(
      period.endDate,
      ({ valueOf }) => !valueOf(period.finished) && !valueOf(period.abandoned),
    );
    validate(period.endDate, ({ value, valueOf }) => {
      if (!valueOf(period.finished) && !valueOf(period.abandoned)) {
        return undefined;
      }
      if (value() === '') {
        return { kind: 'required', message: 'Informe o dia do término.' };
      }
      if (value() > this.today()) {
        return { kind: 'future', message: 'A data não pode ser no futuro.' };
      }
      return value() < valueOf(period.startDate)
        ? { kind: 'order', message: 'A data final precisa ser depois do início.' }
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
          endDate: current.endDate ?? this.today(),
          finished: current.status === 'FINISHED',
          abandoned: current.status === 'ABANDONED',
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
          await this.router.navigate(['/livro', bookId]);
        }
      });
      return undefined;
    });
  }

  /** Terminei and Abandonei: marking one unmarks the other. */
  protected setEnd(kind: 'finished' | 'abandoned', checked: boolean): void {
    this.periodModel.update((model) => ({
      ...model,
      finished: kind === 'finished' ? checked : checked ? false : model.finished,
      abandoned: kind === 'abandoned' ? checked : checked ? false : model.abandoned,
    }));
  }

  /**
   * Salvar período: the start and the reread mark, then the end the reader marked. An abandoned
   * reading unmarked as abandoned is in progress again.
   */
  protected async savePeriod(event: Event, reading: ReadingResponse): Promise<void> {
    event.preventDefault();
    const startField = this.periodForm.startDate();
    const endField = this.periodForm.endDate();
    startField.markAsTouched();
    endField.markAsTouched();
    if (startField.invalid() || endField.invalid()) {
      return;
    }
    const { startDate, reread, endDate, finished, abandoned } = this.periodModel();
    await this.send(async () => {
      let status = reading.status;
      if (status === 'ABANDONED' && !abandoned) {
        await firstValueFrom(this.readingApi.resumeReading(reading.id));
        status = 'IN_PROGRESS';
      }
      if (status === 'IN_PROGRESS') {
        await firstValueFrom(this.readingApi.updateReading(reading.id, { startDate, reread }));
        if (finished) {
          await firstValueFrom(this.readingApi.finishReading(reading.id, endDate));
        } else if (abandoned) {
          await firstValueFrom(this.readingApi.abandonReading(reading.id, endDate));
        }
      } else {
        await firstValueFrom(
          this.readingApi.updateReading(reading.id, { startDate, endDate, reread }),
        );
      }
      if (finished) {
        await this.router.navigate(['/livro', reading.bookId]);
        return;
      }
      this.notice.set(
        abandoned ? '✦ Leitura marcada como abandonada.' : '✦ Início da leitura salvo.',
      );
      this.readings.reload();
    });
  }

  /** Another book in the selector: the page of its reading. */
  protected chooseBook(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    if (id && id !== this.id()) {
      this.selectedDay.set(undefined);
      this.monday.set(undefined);
      void this.router.navigate(['/livro', id, 'leitura']);
    }
  }

  /** Choosing a day in the field of the session also moves the week to it. */
  protected pickDay(day: IsoDate): void {
    this.selectedDay.set(day);
    this.monday.set(startOfWeek(day));
  }

  protected async deleteSession(reading: ReadingResponse, session: SessionResponse): Promise<void> {
    await this.send(async () => {
      await firstValueFrom(this.readingApi.deleteSession(reading.id, session.id));
      this.notice.set('Sessão excluída.');
      this.refresh();
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
