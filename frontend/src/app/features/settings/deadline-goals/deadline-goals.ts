import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ApiError } from '@core/api/api-error';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import {
  deadlineClock,
  deadlinePeriod,
  DeadlineState,
  deadlineState,
  deadlineTitle,
  GOAL_TYPE_LABELS,
  goalProgress,
} from '@core/api/goal-labels';
import {
  DeadlineGoalRequest,
  DeadlineGoalResponse,
  GOAL_TYPES,
  GoalsApi,
  GoalType,
} from '@core/api/goals-api';
import { IsoDate, parseIsoDate, TODAY, toIsoDate } from '@core/time/today';
import { Button } from '@shared/ui/button/button';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';
import { firstValueFrom } from 'rxjs';

/** What is being typed in the form; the numbers stay text until they are saved. */
interface Draft {
  readonly type: GoalType;
  readonly target: string;
  /** Empty counts every genre. */
  readonly genreId: string;
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
}

type Field = 'target' | 'startDate' | 'endDate';

/** A ready-made period for the form: the reader can still change both dates afterwards. */
interface Shortcut {
  readonly label: string;
  readonly range: (today: IsoDate) => readonly [IsoDate, IsoDate];
}

const MAX_TARGET = 1_000_000;

/** The same day some months later, or the last day of that month when it is shorter. */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const moment = parseIsoDate(date);
  const day = moment.getDate();
  moment.setDate(1);
  moment.setMonth(moment.getMonth() + months);
  const lastDay = new Date(moment.getFullYear(), moment.getMonth() + 1, 0).getDate();
  moment.setDate(Math.min(day, lastDay));
  return toIsoDate(moment);
}

const SHORTCUTS: readonly Shortcut[] = [
  { label: 'Próximos 3 meses', range: (today) => [today, addMonths(today, 3)] },
  { label: 'Próximos 6 meses', range: (today) => [today, addMonths(today, 6)] },
  {
    label: 'Até o fim do ano',
    range: (today) => [today, `${today.slice(0, 4)}-12-31`],
  },
  {
    label: 'Ano que vem',
    range: (today) => {
      const next = Number(today.slice(0, 4)) + 1;
      return [`${next}-01-01`, `${next}-12-31`];
    },
  },
];

/** The ones still counting first, then the ones that have not started, then the ones that ended. */
const STATE_ORDER: readonly DeadlineState[] = ['running', 'upcoming', 'ended'];

const STATE_LABELS: Readonly<Record<DeadlineState, string>> = {
  running: 'Em andamento',
  upcoming: 'Ainda não começou',
  ended: 'Encerrada',
};

/**
 * Metas com prazo: goals between two dates the reader chooses, like "2 livros de não ficção nos
 * próximos 6 meses" or "20 livros em 2027", optionally only for one genre and its subgenres.
 * Unlike the four goals above, each one is saved on its own, as soon as the form is sent.
 */
@Component({
  selector: 'ml-deadline-goals',
  imports: [Button, ConfirmDialog, ProgressBar],
  templateUrl: './deadline-goals.html',
  styleUrl: './deadline-goals.css',
})
export class DeadlineGoals {
  private readonly goalsApi = inject(GoalsApi);
  private readonly genresApi = inject(GenresApi);
  private readonly todayOf = inject(TODAY);

  protected readonly today = computed(() => this.todayOf());
  protected readonly goals = httpResource<DeadlineGoalResponse[]>(() =>
    this.goalsApi.deadlinesRequest(),
  );
  protected readonly genres = httpResource<GenreTreeResponse[]>(() => this.genresApi.treeRequest());

  protected readonly types = GOAL_TYPES.map((type) => ({ type, label: GOAL_TYPE_LABELS[type] }));
  protected readonly shortcuts = SHORTCUTS;
  protected readonly stateLabels = STATE_LABELS;

  /** `new` while a goal is being created, the id of the one being edited, or nothing. */
  protected readonly editing = signal<number | 'new' | undefined>(undefined);
  protected readonly draft = signal<Draft>(this.emptyDraft());
  protected readonly tried = signal(false);
  protected readonly saving = signal(false);
  protected readonly flash = signal<string | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);

  /** The goal waiting for the confirmation of its deletion. */
  protected readonly deleting = signal<DeadlineGoalResponse | undefined>(undefined);
  private readonly confirmDeletion = viewChild(ConfirmDialog);

  protected readonly sorted = computed(() => {
    const today = this.today();
    const goals = this.goals.value() ?? [];
    return STATE_ORDER.flatMap((state) =>
      goals.filter((goal) => deadlineState(goal, today) === state).map((goal) => ({ goal, state })),
    );
  });

  protected readonly errors = computed<Partial<Record<Field, string>>>(() => {
    const { target, startDate, endDate } = this.draft();
    const errors: Partial<Record<Field, string>> = {};
    const amount = Number(target);
    if (!/^\d+$/.test(target.trim()) || amount <= 0) {
      errors.target = 'Informe um número inteiro maior que zero.';
    } else if (amount > MAX_TARGET) {
      errors.target = 'O máximo é 1.000.000.';
    }
    if (!startDate) {
      errors.startDate = 'Escolha a data de início.';
    }
    if (!endDate) {
      errors.endDate = 'Escolha a data final.';
    } else if (startDate && endDate < startDate) {
      errors.endDate = 'A data final precisa ser no mesmo dia ou depois do início.';
    }
    return errors;
  });

  protected readonly title = deadlineTitle;
  protected readonly period = deadlinePeriod;
  protected readonly progress = goalProgress;

  protected clock(goal: DeadlineGoalResponse): string {
    return deadlineClock(goal, this.today());
  }

  protected errorOf(field: Field): string | undefined {
    return this.tried() ? this.errors()[field] : undefined;
  }

  protected startNew(): void {
    this.open('new', this.emptyDraft());
  }

  protected edit(goal: DeadlineGoalResponse): void {
    this.open(goal.id, {
      type: goal.type,
      target: String(goal.target),
      genreId: goal.genre ? String(goal.genre.id) : '',
      startDate: goal.startDate,
      endDate: goal.endDate,
    });
  }

  protected cancel(): void {
    this.editing.set(undefined);
    this.failure.set(undefined);
  }

  protected change<K extends keyof Draft>(key: K, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  protected useShortcut(shortcut: Shortcut): void {
    const [startDate, endDate] = shortcut.range(this.today());
    this.draft.update((draft) => ({ ...draft, startDate, endDate }));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.tried.set(true);
    this.flash.set(undefined);
    this.failure.set(undefined);
    const editing = this.editing();
    if (editing === undefined || Object.keys(this.errors()).length > 0) {
      return;
    }
    const { type, target, genreId, startDate, endDate } = this.draft();
    const request: DeadlineGoalRequest = {
      type,
      target: Number(target),
      startDate,
      endDate,
      ...(genreId ? { genreId: Number(genreId) } : {}),
    };
    this.saving.set(true);
    try {
      await firstValueFrom(
        editing === 'new'
          ? this.goalsApi.createDeadline(request)
          : this.goalsApi.updateDeadline(editing, request),
      );
      this.editing.set(undefined);
      this.flash.set(editing === 'new' ? 'Meta com prazo criada.' : 'Meta com prazo salva.');
      this.goals.reload();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.saving.set(false);
    }
  }

  protected askToDelete(goal: DeadlineGoalResponse): void {
    this.deleting.set(goal);
    this.confirmDeletion()?.open();
  }

  protected async delete(): Promise<void> {
    const goal = this.deleting();
    if (!goal) {
      return;
    }
    this.saving.set(true);
    this.flash.set(undefined);
    this.failure.set(undefined);
    try {
      await firstValueFrom(this.goalsApi.deleteDeadline(goal.id));
      if (this.editing() === goal.id) {
        this.editing.set(undefined);
      }
      this.flash.set('Meta com prazo excluída.');
      this.goals.reload();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.saving.set(false);
      this.deleting.set(undefined);
      this.confirmDeletion()?.close();
    }
  }

  private open(editing: number | 'new', draft: Draft): void {
    this.editing.set(editing);
    this.draft.set(draft);
    this.tried.set(false);
    this.flash.set(undefined);
    this.failure.set(undefined);
  }

  /** A new goal starts with books over the next six months, the example most goals follow. */
  private emptyDraft(): Draft {
    const today = this.todayOf();
    return {
      type: 'BOOKS',
      target: '',
      genreId: '',
      startDate: today,
      endDate: addMonths(today, 6),
    };
  }
}
