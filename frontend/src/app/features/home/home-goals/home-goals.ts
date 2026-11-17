import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { goalProgress, goalTitle } from '@core/api/goal-labels';
import { GoalResponse } from '@core/api/goals-api';
import { Icon } from '@shared/ui/icon/icon';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';
import { ProgressRing } from '@shared/ui/progress-ring/progress-ring';

const SIDE_GOALS = 3;

/** `Faltam 9 livros para fechar a meta de 2026.` */
export function remainingOf(goal: GoalResponse): string {
  const left = goal.target - goal.current;
  if (left <= 0) {
    return `Meta de ${goal.year} alcançada.`;
  }
  const unit = {
    BOOKS: ['livro', 'livros'],
    PAGES: ['página', 'páginas'],
    REREADS: ['releitura', 'releituras'],
  }[goal.type];
  const word = left === 1 ? 'Falta' : 'Faltam';
  return `${word} ${left.toLocaleString('pt-BR')} ${left === 1 ? unit[0] : unit[1]} para fechar a meta.`;
}

/**
 * Minhas metas: the yearly goal of books in a ring, and up to three other goals of the year
 * beside it. The page of goals is where they are created and changed.
 */
@Component({
  selector: 'ml-home-goals',
  imports: [Icon, ProgressBar, ProgressRing, RouterLink],
  templateUrl: './home-goals.html',
  styleUrls: ['../home-section.css', './home-goals.css'],
})
export class HomeGoals {
  readonly goals = input.required<readonly GoalResponse[]>();
  readonly year = input.required<number>();

  /** The yearly goal of books; without it, the first goal there is. */
  protected readonly main = computed(
    () =>
      this.goals().find((goal) => goal.type === 'BOOKS' && goal.period === 'YEAR') ??
      this.goals()[0],
  );
  protected readonly others = computed(() =>
    this.goals()
      .filter((goal) => goal !== this.main())
      .slice(0, SIDE_GOALS),
  );

  protected readonly title = goalTitle;
  protected readonly progress = goalProgress;
  protected readonly remaining = remainingOf;
}
