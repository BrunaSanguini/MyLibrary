import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { GoalResponse, GoalsApi } from '@core/api/goals-api';
import { ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { TODAY } from '@core/time/today';

import { AuthorCards } from '../author-cards/author-cards';
import { FavoritesFlow } from '../favorites-flow/favorites-flow';
import { HomeGoals } from '../home-goals/home-goals';
import { HomeHero } from '../home-hero/home-hero';
import { ListCards } from '../list-cards/list-cards';
import { ReadingNow } from '../reading-now/reading-now';

const FEATURED = 3;
const FAVORITES = 12;

/**
 * Início: the favorites in the hero and in the coverflow, the goals of the year, then, as the
 * page scrolls, what is being read, the authors and the lists. The sections below the fold load
 * only when they come near the screen.
 */
@Component({
  selector: 'ml-home-page',
  imports: [AuthorCards, FavoritesFlow, HomeGoals, HomeHero, ListCards, ReadingNow],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export default class HomePage {
  private readonly shelfApi = inject(ShelfApi);
  private readonly goalsApi = inject(GoalsApi);
  private readonly today = inject(TODAY);

  protected readonly year = computed(() => Number(this.today().slice(0, 4)));

  /** The best rated first: they are the ones that deserve the hero. */
  protected readonly favorites = httpResource<ShelfPage>(() =>
    this.shelfApi.booksRequest({ favorite: true, sort: 'rating', size: FAVORITES }),
  );
  protected readonly favoriteBooks = computed(() => this.favorites.value()?.content ?? []);
  protected readonly featured = computed(() => this.favoriteBooks().slice(0, FEATURED));

  protected readonly goals = httpResource<GoalResponse[]>(() =>
    this.goalsApi.listRequest(this.year()),
  );
}
