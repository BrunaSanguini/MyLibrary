const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function count(amount: number, singular: string, plural: string): string {
  return `há ${amount} ${amount === 1 ? singular : plural}`;
}

/**
 * How long ago a moment was, in the words of a card: `agora`, `há 5 minutos`, `há 3 dias`,
 * `há 1 semana`, `há 2 meses`.
 *
 * <p>Only whole units, rounded down, so `há 1 mês` starts at 30 days. A moment in the future, which
 * a clock a little ahead of the server's produces, counts as now.
 */
export function relativeTimeSince(moment: string | Date, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - new Date(moment).getTime());
  if (elapsed < MINUTE) {
    return 'agora';
  }
  if (elapsed < HOUR) {
    return count(Math.floor(elapsed / MINUTE), 'minuto', 'minutos');
  }
  if (elapsed < DAY) {
    return count(Math.floor(elapsed / HOUR), 'hora', 'horas');
  }
  const days = Math.floor(elapsed / DAY);
  if (days < 7) {
    return count(days, 'dia', 'dias');
  }
  if (days < 30) {
    return count(Math.floor(days / 7), 'semana', 'semanas');
  }
  if (days < 365) {
    return count(Math.floor(days / 30), 'mês', 'meses');
  }
  return count(Math.floor(days / 365), 'ano', 'anos');
}
