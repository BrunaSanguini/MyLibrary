import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShelfApi, ShelfFilter, ShelfPage } from '@core/api/shelf-api';
import { Icon } from '@shared/ui/icon/icon';
import { IconName } from '@shared/ui/icon/icons';

interface Special {
  readonly id: 'wishlist' | 'favoritos' | 'releituras';
  readonly name: string;
  readonly description: string;
  readonly icon: IconName;
  /** What the shelf is asked for to count the books. */
  readonly filter: ShelfFilter;
  /** The same filter in the address of Minha Estante. */
  readonly queryParams: Record<string, string>;
}

/** The three automatic lists, in the order of the spec. */
export const SPECIAL_LISTS: readonly Special[] = [
  {
    id: 'wishlist',
    name: 'Wishlist',
    description: 'Livros que você quer ter',
    icon: 'wishlist',
    filter: { ownership: 'WISHLIST' },
    queryParams: { status: 'wishlist' },
  },
  {
    id: 'favoritos',
    name: 'Favoritos',
    description: 'Livros que você marcou com ♥',
    icon: 'star',
    filter: { favorite: true },
    queryParams: { favoritos: '1' },
  },
  {
    id: 'releituras',
    name: 'Releituras',
    description: 'Lidos mais de uma vez',
    icon: 'reread',
    filter: { reread: true },
    queryParams: { releituras: '1' },
  },
];

/**
 * Wishlist, Favoritos and Releituras: lists nobody creates, renames or deletes. Each card counts
 * its books on the shelf and opens Minha Estante with the same filter on.
 *
 * <p>One page of one book per card is enough to count: the answer is `totalElements`.
 */
@Component({
  selector: 'ml-special-lists',
  imports: [Icon, RouterLink],
  templateUrl: './special-lists.html',
  styleUrl: './special-lists.css',
})
export class SpecialLists {
  private readonly shelfApi = inject(ShelfApi);

  protected readonly specials = SPECIAL_LISTS.map((special) => ({
    ...special,
    count: httpResource<ShelfPage>(() =>
      this.shelfApi.booksRequest({ ...special.filter, size: 1 }),
    ),
  }));
}
