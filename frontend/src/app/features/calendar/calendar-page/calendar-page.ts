import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { CalendarEntry, ReadingCalendar, StatsApi } from '@core/api/stats-api';
import { formatLongWeekday, IsoDate, parseIsoDate, TODAY, toIsoDate } from '@core/time/today';
import { bookColorOf, BookCover } from '@shared/ui/book-cover/book-cover';
import { Button } from '@shared/ui/button/button';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** `2026-11`, as in the address (`/calendario?mes=2026-11`). */
const MONTH_PARAM = /^(\d{4})-(0[1-9]|1[0-2])$/;

interface Month {
  readonly year: number;
  /** 1 to 12. */
  readonly month: number;
}

interface Cell {
  readonly date: IsoDate;
  readonly day: number;
  readonly inMonth: boolean;
  readonly today: boolean;
  readonly future: boolean;
  readonly books: readonly CalendarEntry[];
  readonly pages: number;
  /** "Início" or "Fim", when a reading started or ended on the day. */
  readonly flag?: string;
  readonly background?: string;
  readonly label: string;
}

function toMonth(value: unknown): Month | undefined {
  const match = typeof value === 'string' ? MONTH_PARAM.exec(value) : null;
  return match ? { year: Number(match[1]), month: Number(match[2]) } : undefined;
}

function shift({ year, month }: Month, by: number): Month {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function paramOf({ year, month }: Month): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Calendário de leitura: one month, each day painted with the books read on it and the pages of
 * the day. A day opens its details beside the grid; a book of the legend highlights its days.
 */
@Component({
  selector: 'ml-calendar-page',
  imports: [BookCover, Button, ErrorState, Icon, RouterLink],
  templateUrl: './calendar-page.html',
  styleUrls: ['./calendar-page.css', './calendar-grid.css'],
})
export default class CalendarPage {
  /** Query parameter `mes`; without it (or with something else), the current month. */
  readonly mes = input<string>();

  private readonly router = inject(Router);
  private readonly statsApi = inject(StatsApi);
  private readonly today = inject(TODAY);

  protected readonly todayDate = computed(() => this.today());

  protected readonly current = computed<Month>(() => {
    const chosen = toMonth(this.mes());
    if (chosen) {
      return chosen;
    }
    const today = parseIsoDate(this.today());
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  });

  protected readonly calendar = httpResource<ReadingCalendar>(() => {
    const { year, month } = this.current();
    return this.statsApi.calendarRequest(year, month);
  });

  protected readonly selected = signal<IsoDate | undefined>(undefined);
  protected readonly highlighted = signal<number | undefined>(undefined);

  protected readonly title = computed(() => {
    const { year, month } = this.current();
    const name = MONTHS[month - 1] ?? '';
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${year}`;
  });

  protected readonly weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  private readonly byDate = computed(() => {
    const map = new Map<IsoDate, readonly CalendarEntry[]>();
    for (const day of this.calendar.value()?.days ?? []) {
      map.set(day.date, day.books);
    }
    return map;
  });

  /** Whole weeks, Monday first, with the days of the months around in a lighter tone. */
  protected readonly cells = computed<readonly Cell[]>(() => {
    const { year, month } = this.current();
    const first = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    const rows = Math.ceil((lead + daysInMonth) / 7);
    const today = this.today();
    const cells: Cell[] = [];
    for (let index = 0; index < rows * 7; index++) {
      const moment = new Date(year, month - 1, 1 - lead + index);
      const date = toIsoDate(moment);
      const inMonth = moment.getMonth() === month - 1;
      const books = inMonth ? (this.byDate().get(date) ?? []) : [];
      const pages = books.reduce((sum, book) => sum + book.pages, 0);
      const monthOf = `de ${MONTHS[moment.getMonth()]}`;
      cells.push({
        date,
        day: moment.getDate(),
        inMonth,
        today: date === today,
        future: date > today,
        books,
        pages,
        flag: books.some((book) => book.started)
          ? 'Início'
          : books.some((book) => book.finished)
            ? 'Fim'
            : undefined,
        background: backgroundOf(books),
        // Read after the number of the day, which is on the screen: " de novembro: O Hobbit, 20 páginas".
        label:
          books.length > 0
            ? ` ${monthOf}: ${books.map((book) => `${book.title}, ${book.pages} páginas`).join('; ')}`
            : ` ${monthOf}`,
      });
    }
    return cells;
  });

  protected readonly rows = computed(() => this.cells().length / 7);

  /** The books of the month and on how many days each one was read. */
  protected readonly legend = computed(() => {
    const books = new Map<number, { entry: CalendarEntry; days: number }>();
    for (const day of this.calendar.value()?.days ?? []) {
      for (const entry of day.books) {
        const known = books.get(entry.bookId);
        books.set(entry.bookId, { entry, days: (known?.days ?? 0) + 1 });
      }
    }
    return [...books.values()].map(({ entry, days }) => ({
      id: entry.bookId,
      title: entry.title,
      color: bookColorOf(entry.title),
      days: days === 1 ? '1 dia' : `${days} dias`,
    }));
  });

  protected readonly stats = computed(() => {
    const calendar = this.calendar.value();
    const days = calendar?.days ?? [];
    const pages = days.reduce(
      (sum, day) => sum + day.books.reduce((daySum, book) => daySum + book.pages, 0),
      0,
    );
    return [
      { value: String(days.length), label: 'dias lendo' },
      { value: String(this.legend().length), label: 'livros' },
      { value: pages.toLocaleString('pt-BR'), label: 'páginas' },
      { value: String(calendar?.finished ?? 0), label: 'terminados' },
    ];
  });

  protected readonly selectedCell = computed(() =>
    this.cells().find((cell) => cell.date === this.selected()),
  );

  protected readonly selectedTitle = computed(() => {
    const date = this.selected();
    if (!date) {
      return undefined;
    }
    const moment = parseIsoDate(date);
    return `${moment.getDate()} de ${MONTHS[moment.getMonth()]}`;
  });

  protected readonly selectedWeekday = computed(() => {
    const date = this.selected();
    if (!date) {
      return undefined;
    }
    const weekday = formatLongWeekday(date);
    return date === this.today() ? `${weekday} · hoje` : weekday;
  });

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.calendar.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected dimmed(cell: Cell): boolean {
    const book = this.highlighted();
    return book !== undefined && !cell.books.some((entry) => entry.bookId === book);
  }

  protected coverColor(title: string): string {
    return bookColorOf(title);
  }

  protected pick(cell: Cell): void {
    if (cell.future || !cell.inMonth) {
      return;
    }
    this.selected.update((date) => (date === cell.date ? undefined : cell.date));
  }

  protected toggleHighlight(id: number): void {
    this.highlighted.update((current) => (current === id ? undefined : id));
  }

  protected flagOf(entry: CalendarEntry): string | undefined {
    if (entry.finished) {
      return 'Terminou';
    }
    return entry.started ? 'Começou' : undefined;
  }

  protected previous(): void {
    this.goTo(shift(this.current(), -1));
  }

  protected next(): void {
    this.goTo(shift(this.current(), 1));
  }

  protected goToday(): void {
    void this.router.navigate([], { queryParams: { mes: null } });
    this.highlighted.set(undefined);
    this.selected.set(this.today());
  }

  private goTo(month: Month): void {
    this.selected.set(undefined);
    this.highlighted.set(undefined);
    void this.router.navigate([], { queryParams: { mes: paramOf(month) } });
  }
}

/** One book paints the day; two split it in half. */
function backgroundOf(books: readonly CalendarEntry[]): string | undefined {
  const [first, second] = books;
  if (!first) {
    return undefined;
  }
  const one = bookColorOf(first.title);
  return second ? `linear-gradient(90deg, ${one} 50%, ${bookColorOf(second.title)} 50%)` : one;
}
