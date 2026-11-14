import { CatalogKind } from '@core/api/catalog-api';
import { ShelfFilter } from '@core/api/shelf-api';

/** The four ways the collection is grouped. Lists join them in Marco 4. */
export const GROUP_KINDS = ['genres', 'authors', 'publishers', 'series'] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

interface GroupInfo {
  /** Tab on /catalogos and its value in the address bar (routes are in Portuguese). */
  readonly tab: string;
  readonly plural: string;
  readonly singular: string;
  /** First segment of the page of one group, as in /autores/7. */
  readonly path: string;
  /** Filter of the shelf listing that brings the books of the group. */
  readonly filter: keyof Pick<ShelfFilter, 'genreId' | 'authorId' | 'publisherId' | 'seriesId'>;
}

export const GROUPS: Readonly<Record<GroupKind, GroupInfo>> = {
  genres: {
    tab: 'generos',
    plural: 'Gêneros',
    singular: 'Gênero',
    path: '/generos',
    filter: 'genreId',
  },
  authors: {
    tab: 'autores',
    plural: 'Autores',
    singular: 'Autor',
    path: '/autores',
    filter: 'authorId',
  },
  publishers: {
    tab: 'editoras',
    plural: 'Editoras',
    singular: 'Editora',
    path: '/editoras',
    filter: 'publisherId',
  },
  series: {
    tab: 'series',
    plural: 'Séries',
    singular: 'Série',
    path: '/series',
    filter: 'seriesId',
  },
};

/** Catalogs that are flat, paginated lists; genres are a tree and have their own request. */
export function isListed(kind: GroupKind): kind is CatalogKind {
  return kind !== 'genres';
}

export function toGroupKind(tab: unknown): GroupKind {
  return GROUP_KINDS.find((kind) => GROUPS[kind].tab === tab) ?? 'genres';
}
