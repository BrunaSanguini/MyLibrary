import { GoalResponse, GoalType } from './goals-api';

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
