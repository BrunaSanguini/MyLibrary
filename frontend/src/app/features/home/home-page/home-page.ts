import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { FeaturedApi, FeaturedBook } from '@core/api/featured-api';
import { deadlineState } from '@core/api/goal-labels';
import { DeadlineGoalResponse, GoalResponse, GoalsApi } from '@core/api/goals-api';
import { ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { TODAY } from '@core/time/today';

import { AuthorCards } from '../author-cards/author-cards';
import { FavoritesFlow } from '../favorites-flow/favorites-flow';
import { HomeGoals } from '../home-goals/home-goals';
import { HeroBook, HomeHero } from '../home-hero/home-hero';
import { ListCards } from '../list-cards/list-cards';
import { ReadingNow } from '../reading-now/reading-now';

const FEATURED = 3;
const FAVORITES = 12;

/**
 * Início: the featured books in the hero (the favorites, while none is chosen in Configurações),
 * the favorites in the coverflow, the goals that are on, then, as the
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
  private readonly featuredApi = inject(FeaturedApi);
  private readonly today = inject(TODAY);

  protected readonly year = computed(() => Number(this.today().slice(0, 4)));
  private readonly month = computed(() => Number(this.today().slice(5, 7)));

  /** Chosen in Configurações → Destaques da Home, each with its own image. */
  private readonly chosen = httpResource<FeaturedBook[]>(() => this.featuredApi.listRequest());

  /** The best rated first: they are the ones that deserve the hero. */
  protected readonly favorites = httpResource<ShelfPage>(() =>
    this.shelfApi.booksRequest({ favorite: true, sort: 'rating', size: FAVORITES }),
  );
  protected readonly favoriteBooks = computed(() => this.favorites.value()?.content ?? []);
  protected readonly featured = computed<readonly HeroBook[]>(() => {
    const chosen = this.chosen.value() ?? [];
    return chosen.length > 0
      ? chosen.map((book) => ({
          id: book.bookId,
          title: book.title,
          authors: book.authors,
          coverUrl: book.coverUrl,
          imageUrl: book.imageUrl,
        }))
      : this.favoriteBooks().slice(0, FEATURED);
  });
  protected readonly heroLoading = computed(
    () => this.chosen.isLoading() || this.favorites.isLoading(),
  );

  private readonly goals = httpResource<GoalResponse[]>(() =>
    this.goalsApi.listRequest(this.year()),
  );
  /** The goals that are on: the yearly ones and the one of this month. */
  protected readonly shownGoals = computed(() =>
    this.goals.hasValue()
      ? this.goals
          .value()
          .filter(
            (goal) =>
              goal.enabled !== false && (goal.period === 'YEAR' || goal.month === this.month()),
          )
      : undefined,
  );

  private readonly deadlines = httpResource<DeadlineGoalResponse[]>(() =>
    this.goalsApi.deadlinesRequest(),
  );
  /** The goals with a deadline that are running today, the one that ends first first. */
  protected readonly runningDeadlines = computed(() =>
    (this.deadlines.value() ?? []).filter(
      (goal) => deadlineState(goal, this.today()) === 'running',
    ),
  );
}
