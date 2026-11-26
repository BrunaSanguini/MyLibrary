import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { deadlineClock, deadlineTitle, goalProgress, MONTHS } from '@core/api/goal-labels';
import { DeadlineGoalResponse, GoalResponse } from '@core/api/goals-api';
import { formatShortDate, TODAY } from '@core/time/today';
import { toRoman } from '@shared/format/roman';
import { Icon } from '@shared/ui/icon/icon';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';

const SIDE_GOALS = 3;
const NUMBER = new Intl.NumberFormat('pt-BR');

/** The circle of the ring: r 58, so the whole stroke measures 364,4. */
const RING_RADIUS = 58;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const UNITS: Readonly<Record<GoalResponse['type'], readonly [string, string]>> = {
  BOOKS: ['livro', 'livros'],
  PAGES: ['página', 'páginas'],
  REREADS: ['releitura', 'releituras'],
};

/** `Faltam 9 livros para fechar a meta de 2026.`, or `Meta de 2026 cumprida ✦`. */
export function remainingOf(goal: GoalResponse): string {
  const left = goal.target - goal.current;
  if (left <= 0) {
    return `Meta de ${goal.year} cumprida ✦`;
  }
  const [one, many] = UNITS[goal.type];
  const word = left === 1 ? 'Falta' : 'Faltam';
  return `${word} ${NUMBER.format(left)} ${left === 1 ? one : many} para fechar a meta de ${goal.year}.`;
}

/** The name of a goal on its card: `Meta anual`, `Páginas no ano`, `Meta de novembro`. */
export function labelOf(goal: GoalResponse): string {
  if (goal.period === 'MONTH') {
    const month = MONTHS[(goal.month ?? 1) - 1]?.label ?? '';
    return goal.type === 'PAGES' ? `Páginas em ${month}` : `Meta de ${month}`;
  }
  return { BOOKS: 'Meta anual', PAGES: 'Páginas no ano', REREADS: 'Releituras' }[goal.type];
}

/** Where each goal goes on the Home: the ring first, then pages, the month and the rereads. */
const ORDER = ['BOOKS-YEAR', 'PAGES-YEAR', 'BOOKS-MONTH', 'PAGES-MONTH', 'REREADS-YEAR'];

/**
 * Minhas metas: the yearly goal of books in a ring, in Roman numerals, and up to three other goals
 * beside it, each with a gold thread. Below them, the goals with a deadline that are running
 * today. The goals are changed in Configurações → Metas; a goal that is off there does not get
 * here.
 */
@Component({
  selector: 'ml-home-goals',
  imports: [Icon, ProgressBar, RouterLink],
  templateUrl: './home-goals.html',
  styleUrls: ['../home-section.css', './home-goals.css'],
})
export class HomeGoals {
  readonly goals = input.required<readonly GoalResponse[]>();
  readonly year = input.required<number>();
  /** The goals with a deadline that are running today. */
  readonly deadlines = input<readonly DeadlineGoalResponse[]>([]);

  private readonly today = inject(TODAY);

  private readonly sorted = computed(() =>
    [...this.goals()].sort(
      (a, b) => ORDER.indexOf(`${a.type}-${a.period}`) - ORDER.indexOf(`${b.type}-${b.period}`),
    ),
  );

  /** The yearly goal of books; without it, the first goal there is. */
  protected readonly main = computed(() => this.sorted()[0]);
  protected readonly others = computed(() => this.sorted().slice(1, 1 + SIDE_GOALS));

  protected readonly romanYear = computed(() => toRoman(this.year()));
  protected readonly ringLength = RING_LENGTH;

  protected readonly label = labelOf;
  protected readonly remaining = remainingOf;
  protected readonly deadlineTitle = deadlineTitle;
  protected readonly deadlineProgress = goalProgress;

  /** `Faltam 77 dias · até 11 de fev.` */
  protected deadlineClockOf(goal: DeadlineGoalResponse): string {
    return `${deadlineClock(goal, this.today())} · até ${formatShortDate(goal.endDate)}`;
  }

  /** `III` of `XII` books; pages keep their digits. */
  protected numberOf(goal: GoalResponse, value: number): string {
    return goal.type === 'PAGES' ? NUMBER.format(value) : toRoman(value);
  }

  protected formatted(value: number): string {
    return NUMBER.format(value);
  }

  /** `3/12 livros`. */
  protected countOf(goal: GoalResponse): string {
    const [one, many] = UNITS[goal.type];
    return `${NUMBER.format(goal.current)}/${NUMBER.format(goal.target)} ${goal.target === 1 ? one : many}`;
  }

  /** `/ 4.000`, or `/ 2 livros` when the unit is not in the label. */
  protected targetOf(goal: GoalResponse): string {
    const [one, many] = UNITS[goal.type];
    const unit = goal.type === 'PAGES' ? '' : ` ${goal.target === 1 ? one : many}`;
    return `/ ${NUMBER.format(goal.target)}${unit}`;
  }

  /** How much of the ring the accent arc covers. */
  protected dashOf(goal: GoalResponse): string {
    const filled = (Math.min(goal.percent, 100) / 100) * RING_LENGTH;
    return `${filled} ${RING_LENGTH}`;
  }
}
