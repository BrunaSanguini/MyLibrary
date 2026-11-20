import { httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { ApiError } from '@core/api/api-error';
import { MONTHS } from '@core/api/goal-labels';
import { GoalPeriod, GoalResponse, GoalsApi, GoalType } from '@core/api/goals-api';
import { StatsApi, StatsOverview } from '@core/api/stats-api';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { NOW } from '@core/time/today';
import { toRoman } from '@shared/format/roman';
import { Button } from '@shared/ui/button/button';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';
import { firstValueFrom, Observable } from 'rxjs';

type GoalId = 'anual' | 'paginas' | 'mes' | 'releituras';

/** One of the four goals of the tab, and where its progress comes from. */
interface GoalKind {
  readonly id: GoalId;
  readonly type: GoalType;
  readonly period: GoalPeriod;
  readonly title: string;
  readonly description: string;
  readonly field: string;
  readonly unit: string;
  readonly max: number;
  /** The target offered while the goal does not exist yet. */
  readonly fallback: number;
  /** The yearly goal of books is the ring of the Home: it cannot be turned off. */
  readonly locked: boolean;
  readonly current: (stats: StatsOverview) => number;
}

interface Draft {
  readonly on: boolean;
  readonly value: string;
}

const NUMBER = new Intl.NumberFormat('pt-BR');
const LONG_DATE = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Metas: the four goals of the year and of the month, each turned on or off and given a target,
 * saved together. The year and the month are the ones of the computer; the monthly goal goes on
 * to each new month by itself (the API repeats it).
 *
 * <p>A goal that does not exist yet starts off, with the suggested target ready for when it is
 * turned on; the yearly goal of books is always on, because it is the ring of the Home.
 */
@Component({
  selector: 'ml-goals-settings',
  imports: [Button, ProgressBar],
  templateUrl: './goals-settings.html',
  styleUrl: './goals-settings.css',
})
export class GoalsSettings implements HasUnsavedChanges {
  private readonly goalsApi = inject(GoalsApi);
  private readonly statsApi = inject(StatsApi);
  private readonly today = inject(NOW)();

  protected readonly year = this.today.getFullYear();
  protected readonly month = this.today.getMonth() + 1;
  protected readonly todayText = LONG_DATE.format(this.today);

  protected readonly kinds: readonly GoalKind[] = [
    {
      id: 'anual',
      type: 'BOOKS',
      period: 'YEAR',
      title: 'Meta anual',
      description: `Livros terminados em ${this.year}. É o anel principal da Home.`,
      field: 'Quantos livros no ano',
      unit: 'livros',
      max: 999,
      fallback: 12,
      locked: true,
      current: (stats) => stats.finishedInYear,
    },
    {
      id: 'paginas',
      type: 'PAGES',
      period: 'YEAR',
      title: 'Páginas no ano',
      description: `Páginas lidas em ${this.year}.`,
      field: 'Quantas páginas no ano',
      unit: 'páginas',
      max: 99999,
      fallback: 4000,
      locked: false,
      current: (stats) => stats.pagesInYear,
    },
    {
      id: 'mes',
      type: 'BOOKS',
      period: 'MONTH',
      title: `Meta de ${MONTHS[this.month - 1]?.label ?? ''}`,
      description: 'Livros terminados neste mês. Muda sozinha a cada mês.',
      field: 'Quantos livros no mês',
      unit: 'livros',
      max: 999,
      fallback: 2,
      locked: false,
      current: (stats) => stats.finishedInMonth,
    },
    {
      id: 'releituras',
      type: 'REREADS',
      period: 'YEAR',
      title: 'Releituras',
      description: `Livros que você leu mais de uma vez em ${this.year}.`,
      field: 'Quantas releituras no ano',
      unit: 'releituras',
      max: 999,
      fallback: 3,
      locked: false,
      current: (stats) => stats.rereadsInYear,
    },
  ];

  protected readonly goals = httpResource<GoalResponse[]>(() =>
    this.goalsApi.listRequest(this.year),
  );
  protected readonly stats = httpResource<StatsOverview>(() =>
    this.statsApi.overviewRequest(this.year, this.month),
  );

  /** The goal saved for each of the four, if there is one. */
  private readonly saved = computed(() => {
    const goals = this.goals.hasValue() ? this.goals.value() : [];
    return Object.fromEntries(
      this.kinds.map((kind) => [kind.id, goals.find((goal) => this.matches(goal, kind))]),
    ) as Record<GoalId, GoalResponse | undefined>;
  });

  /** What the screen shows before any change. */
  private readonly initial = computed(
    () =>
      Object.fromEntries(
        this.kinds.map((kind) => {
          const goal = this.saved()[kind.id];
          return [
            kind.id,
            {
              on: kind.locked || (goal?.enabled ?? false),
              value: String(goal?.target ?? kind.fallback),
            },
          ];
        }),
      ) as Record<GoalId, Draft>,
  );

  protected readonly drafts = linkedSignal(() => this.initial());
  protected readonly tried = signal(false);
  protected readonly saving = signal(false);
  protected readonly flash = signal<string | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);

  protected readonly dirty = computed(() =>
    this.kinds.some((kind) => {
      const draft = this.drafts()[kind.id];
      const start = this.initial()[kind.id];
      return draft.on !== start.on || draft.value.trim() !== start.value;
    }),
  );

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  discard(): void {
    this.drafts.set(this.initial());
    this.tried.set(false);
  }

  protected errorOf(kind: GoalKind): string | undefined {
    const draft = this.drafts()[kind.id];
    if (!draft.on || this.valid(kind, draft.value)) {
      return undefined;
    }
    return `Use um número inteiro de 1 a ${NUMBER.format(kind.max)}.`;
  }

  /** `III de XII · 25% concluído`, or `1.240 de 4.000 · 31%` for pages. */
  protected previewOf(kind: GoalKind): { text: string; percent: number } | undefined {
    const draft = this.drafts()[kind.id];
    if (!this.stats.hasValue() || !this.valid(kind, draft.value)) {
      return undefined;
    }
    const target = Number(draft.value);
    const current = kind.current(this.stats.value());
    const percent = Math.min(100, Math.floor((current * 100) / target));
    const numbers =
      kind.type === 'PAGES'
        ? `${NUMBER.format(current)} de ${NUMBER.format(target)}`
        : `${toRoman(current)} de ${toRoman(target)}`;
    return { text: `${numbers} · ${percent}% concluído`, percent };
  }

  protected toggle(kind: GoalKind): void {
    this.update(kind, { on: !this.drafts()[kind.id].on });
  }

  protected type(kind: GoalKind, event: Event): void {
    this.update(kind, { value: (event.target as HTMLInputElement).value });
  }

  protected async save(): Promise<void> {
    this.tried.set(true);
    this.flash.set(undefined);
    this.failure.set(undefined);
    if (this.kinds.some((kind) => this.errorOf(kind))) {
      return;
    }
    this.saving.set(true);
    try {
      for (const kind of this.kinds) {
        const request = this.requestFor(kind);
        if (request) {
          await firstValueFrom(request);
        }
      }
      this.tried.set(false);
      this.flash.set('Metas salvas. A Home já mostra os novos valores.');
      this.goals.reload();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
      this.goals.reload();
    } finally {
      this.saving.set(false);
    }
  }

  protected discardChanges(): void {
    this.discard();
    this.failure.set(undefined);
    this.flash.set('Alterações descartadas.');
  }

  /** What to send for one goal: nothing when it did not change, or is off and never existed. */
  private requestFor(kind: GoalKind): Observable<unknown> | undefined {
    const draft = this.drafts()[kind.id];
    const goal = this.saved()[kind.id];
    const target = this.valid(kind, draft.value) ? Number(draft.value) : goal?.target;
    if (goal) {
      const changed = goal.enabled !== draft.on || goal.target !== target;
      return changed && target !== undefined
        ? this.goalsApi.changeTarget(goal.id, target, draft.on)
        : undefined;
    }
    if (!draft.on || target === undefined) {
      return undefined;
    }
    return this.goalsApi.create({
      type: kind.type,
      period: kind.period,
      year: this.year,
      ...(kind.period === 'MONTH' ? { month: this.month } : {}),
      target,
    });
  }

  private update(kind: GoalKind, change: Partial<Draft>): void {
    this.flash.set(undefined);
    this.drafts.update((drafts) => ({ ...drafts, [kind.id]: { ...drafts[kind.id], ...change } }));
  }

  private valid(kind: GoalKind, value: string): boolean {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) && Number(trimmed) >= 1 && Number(trimmed) <= kind.max;
  }

  private matches(goal: GoalResponse, kind: GoalKind): boolean {
    return (
      goal.type === kind.type &&
      goal.period === kind.period &&
      (kind.period === 'YEAR' || goal.month === this.month)
    );
  }
}
