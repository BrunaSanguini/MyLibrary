import { daysBetween, formatLongDate, IsoDate } from '@core/time/today';

import { DeadlineGoalResponse, GoalResponse, GoalType } from './goals-api';

export const GOAL_TYPE_LABELS: Readonly<Record<GoalType, string>> = {
  BOOKS: 'Livros',
  PAGES: 'Páginas',
  REREADS: 'Releituras',
};

const UNITS: Readonly<Record<GoalType, readonly [one: string, many: string]>> = {
  BOOKS: ['livro', 'livros'],
  PAGES: ['página', 'páginas'],
  REREADS: ['releitura', 'releituras'],
};

const MONTH_NAME = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
const NUMBER = new Intl.NumberFormat('pt-BR');

/** `janeiro` to `dezembro`, by the number the API uses (1 to 12). */
export const MONTHS: readonly { value: number; label: string }[] = Array.from(
  { length: 12 },
  (_, index) => ({ value: index + 1, label: MONTH_NAME.format(new Date(2000, index, 1)) }),
);

/** `Livros em 2026` or `Páginas em novembro`. */
export function goalTitle(goal: Pick<GoalResponse, 'type' | 'year' | 'month'>): string {
  const when = goal.month ? MONTHS[goal.month - 1]?.label : goal.year;
  return `${GOAL_TYPE_LABELS[goal.type]} em ${when}`;
}

/** `6 de 24 livros`, with the thousands separated: `1.250 de 6.000 páginas`. */
export function goalProgress(goal: Pick<GoalResponse, 'type' | 'current' | 'target'>): string {
  const [one, many] = UNITS[goal.type];
  const unit = goal.target === 1 ? one : many;
  return `${NUMBER.format(goal.current)} de ${NUMBER.format(goal.target)} ${unit}`;
}

/** Where a goal with a deadline is, seen from a day: before its start, between its dates, or after its end. */
export type DeadlineState = 'upcoming' | 'running' | 'ended';

export function deadlineState(
  goal: Pick<DeadlineGoalResponse, 'startDate' | 'endDate'>,
  today: IsoDate,
): DeadlineState {
  if (today < goal.startDate) {
    return 'upcoming';
  }
  return today > goal.endDate ? 'ended' : 'running';
}

/** `2 livros de Não ficção`, `20 livros` or `3.000 páginas de Fantasia`. */
export function deadlineTitle(
  goal: Pick<DeadlineGoalResponse, 'type' | 'target' | 'genre'>,
): string {
  const [one, many] = UNITS[goal.type];
  const what = `${NUMBER.format(goal.target)} ${goal.target === 1 ? one : many}`;
  return goal.genre ? `${what} de ${goal.genre.name}` : what;
}

/** `11 de agosto de 2026 → 11 de fevereiro de 2027`. */
export function deadlinePeriod(goal: Pick<DeadlineGoalResponse, 'startDate' | 'endDate'>): string {
  return `${formatLongDate(goal.startDate)} → ${formatLongDate(goal.endDate)}`;
}

/**
 * How the clock of the goal stands: `Faltam 77 dias`, `Último dia`, `Começa em 12 dias`,
 * `Cumprida ✦` once the target is reached, or `Não cumprida` when it ended short of it.
 */
export function deadlineClock(
  goal: Pick<DeadlineGoalResponse, 'startDate' | 'endDate' | 'current' | 'target'>,
  today: IsoDate,
): string {
  if (goal.current >= goal.target) {
    return 'Cumprida ✦';
  }
  const state = deadlineState(goal, today);
  if (state === 'ended') {
    return 'Não cumprida';
  }
  if (state === 'upcoming') {
    const days = daysBetween(today, goal.startDate);
    return days === 1 ? 'Começa amanhã' : `Começa em ${days} dias`;
  }
  const left = daysBetween(today, goal.endDate);
  if (left === 0) {
    return 'Último dia';
  }
  return left === 1 ? 'Falta 1 dia' : `Faltam ${NUMBER.format(left)} dias`;
}
