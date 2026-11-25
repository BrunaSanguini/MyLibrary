import { ShelfFilter, ShelfSort, ShelfStatus, ShelfSummary } from '@core/api/shelf-api';

/** The tabs of Minha Estante, by the name they have in the address bar (`?status=lidos`). */
export const SHELF_TABS = ['todos', 'lendo', 'lidos', 'quero', 'abandonados', 'wishlist'] as const;
export type ShelfTab = (typeof SHELF_TABS)[number];

interface TabInfo {
  readonly label: string;
  /** The status the API filters by; `todos` and `wishlist` filter by none. */
  readonly status?: ShelfStatus;
  readonly count: (summary: ShelfSummary) => number;
}

export const TAB_INFO: Readonly<Record<ShelfTab, TabInfo>> = {
  todos: { label: 'Todos', count: (summary) => summary.shelf },
  lendo: { label: 'Lendo', status: 'READING', count: (summary) => summary.reading },
  lidos: { label: 'Lidos', status: 'READ', count: (summary) => summary.read },
  quero: { label: 'Quero ler', status: 'WANT_TO_READ', count: (summary) => summary.wantToRead },
  abandonados: {
    label: 'Abandonados',
    status: 'ABANDONED',
    count: (summary) => summary.abandoned,
  },
  wishlist: { label: 'Wishlist', count: (summary) => summary.wishlist },
};

/**
 * The tab of the address bar. The status names of the earlier version (`?status=READ`) still
 * open their tab, so old bookmarks keep working.
 */
export function toTab(value: unknown): ShelfTab {
  const raw = Array.isArray(value) ? (value as unknown[])[0] : value;
  if (typeof raw !== 'string') {
    return 'todos';
  }
  if ((SHELF_TABS as readonly string[]).includes(raw)) {
    return raw as ShelfTab;
  }
  const old = SHELF_TABS.find((tab) => TAB_INFO[tab].status === raw);
  return old ?? 'todos';
}

/** The orders of the select, by the name they have in the address bar (`?ordem=titulo`). */
export const SHELF_ORDERS = ['recentes', 'titulo', 'autor', 'nota', 'ano'] as const;
export type ShelfOrder = (typeof SHELF_ORDERS)[number];

export const ORDER_INFO: Readonly<Record<ShelfOrder, { label: string; sort: ShelfSort }>> = {
  recentes: { label: 'Adicionados recentemente', sort: 'addedAt' },
  titulo: { label: 'Título A–Z', sort: 'title' },
  autor: { label: 'Autor A–Z', sort: 'author' },
  nota: { label: 'Maior nota', sort: 'rating' },
  ano: { label: 'Ano de publicação', sort: 'publishedYear' },
};

/** `?favoritos=1`, as the spec writes it; `true` works too. */
export function toOn(value: unknown): boolean {
  return value === '1' || value === 'true';
}

/** What the shelf asks the API for: everything outside the wishlist, or only the wishlist. */
export function filterOf(
  tab: ShelfTab,
  rest: Omit<ShelfFilter, 'status' | 'wishlist'>,
): ShelfFilter {
  const status = TAB_INFO[tab].status;
  return { ...rest, status: status ? [status] : [], wishlist: tab === 'wishlist' };
}
