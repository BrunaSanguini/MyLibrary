import { httpResource } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import { ReadingApi, ReviewsPage } from '@core/api/reading-api';
import { ShelfApi, ShelfSummary } from '@core/api/shelf-api';
import { BookTime, DailyPages, StatsApi, StatsOverview } from '@core/api/stats-api';
import { initialOf, ProfileStore } from '@core/profile/profile-store';
import { CURRENT_HOUR, TODAY } from '@core/time/today';
import { toRoman } from '@shared/format/roman';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Button } from '@shared/ui/button/button';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';

import { ProfileDialog } from '../profile-dialog/profile-dialog';
import {
  formatNumber,
  greetingFor,
  heatStart,
  mostReadGenre,
  paceOf,
  plural,
  romanMonthTitle,
  timeBars,
} from '../profile-stats';
import { ReadingHeatmap } from '../reading-heatmap/reading-heatmap';
import { WeekStrip } from '../week-strip/week-strip';

const REVIEWS = 4;

/**
 * Perfil: who reads and since when, the books finished this month, this year and in all, the
 * latest reviews and how the reading went. Every number comes from what was registered on this
 * computer.
 */
@Component({
  selector: 'ml-profile-page',
  imports: [
    BookCover,
    Button,
    ErrorState,
    Icon,
    ProfileDialog,
    ReadingHeatmap,
    RouterLink,
    Skeleton,
    WeekStrip,
  ],
  templateUrl: './profile-page.html',
  styleUrls: ['./profile-page.css', './profile-sections.css'],
})
export default class ProfilePage {
  private readonly statsApi = inject(StatsApi);
  private readonly readingApi = inject(ReadingApi);
  private readonly shelfApi = inject(ShelfApi);
  private readonly genresApi = inject(GenresApi);
  private readonly profiles = inject(ProfileStore);
  private readonly hour = inject(CURRENT_HOUR);
  private readonly todayOf = inject(TODAY);

  protected readonly today = computed(() => this.todayOf());
  protected readonly year = computed(() => Number(this.today().slice(0, 4)));
  private readonly month = computed(() => Number(this.today().slice(5, 7)));
  private readonly from = computed(() => heatStart(this.today()));

  protected readonly profile = this.profiles.profile;
  protected readonly greeting = greetingFor(this.hour());
  protected readonly name = computed(() => this.profile()?.displayName ?? undefined);
  protected readonly initial = computed(() => initialOf(this.name()));

  protected readonly overview = httpResource<StatsOverview>(() =>
    this.statsApi.overviewRequest(this.year(), this.month()),
  );
  protected readonly daily = httpResource<DailyPages[]>(() =>
    this.statsApi.dailyPagesRequest(this.from(), this.today()),
  );
  private readonly booksTime = httpResource<BookTime[]>(() =>
    this.statsApi.booksTimeRequest(this.from(), this.today()),
  );
  protected readonly reviews = httpResource<ReviewsPage>(() =>
    this.readingApi.latestReviewsRequest(REVIEWS),
  );
  private readonly summary = httpResource<ShelfSummary>(() => this.shelfApi.summaryRequest());
  private readonly tree = httpResource<GenreTreeResponse[]>(() => this.genresApi.treeRequest());
  private readonly cards = rxResource({
    stream: () => this.shelfApi.allBooks({ wishlist: false }),
  });

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.overview.error() ?? this.daily.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  /** The year the reader gave, or the one of her first reading, or this one. */
  protected readonly since = computed(() =>
    toRoman(this.profile()?.readerSince ?? this.overview.value()?.readerSince ?? this.year()),
  );

  /** Terminado neste mês, neste ano, no total, and the average rating. */
  protected readonly numbers = computed(() => {
    const overview = this.overview.value();
    const month = overview?.finishedInMonth ?? 0;
    const year = overview?.finishedInYear ?? 0;
    const total = this.summary.value()?.read ?? 0;
    const finished = (count: number) => (count === 1 ? 'Terminado' : 'Terminados');
    return [
      { value: toRoman(month), label: `${finished(month)} neste mês`, tone: 'accent' },
      { value: toRoman(year), label: `${finished(year)} neste ano`, tone: 'ink' },
      { value: toRoman(total), label: `${finished(total)} no total`, tone: 'ink' },
      {
        value:
          overview?.averageRating?.toLocaleString('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }) ?? '—',
        label: 'Nota média',
        tone: 'gold',
      },
    ];
  });

  /** `Novembro de MMXXVI · em andamento`. */
  protected readonly monthName = computed(() => romanMonthTitle(this.today(), toRoman));

  protected readonly monthLine = computed(() => {
    const finished = this.overview.value()?.finishedInMonth ?? 0;
    return finished === 0
      ? 'Nenhum livro terminado ainda.'
      : `${plural(finished, 'livro terminado', 'livros terminados')} até agora.`;
  });

  /** The latest reviews, each with the authors of its book. */
  protected readonly latest = computed(() => {
    const authorsOf = new Map((this.cards.value() ?? []).map((card) => [card.id, card.authors]));
    return (this.reviews.value()?.content ?? []).map((review) => ({
      ...review,
      authors: (authorsOf.get(review.bookId) ?? []).join(', '),
    }));
  });

  protected readonly stats = computed(() => {
    const overview = this.overview.value();
    return [
      { value: formatNumber(overview?.readingDays ?? 0), label: 'Dias com livro aberto' },
      { value: formatNumber(overview?.currentStreak ?? 0), label: 'Dias seguidos' },
      { value: formatNumber(this.summary.value()?.read ?? 0), label: 'Livros terminados' },
      { value: formatNumber(overview?.notes ?? 0), label: 'Notas registradas' },
    ];
  });

  protected readonly bars = computed(() => timeBars(this.booksTime.value() ?? []));

  protected readonly pace = computed(() => {
    const overview = this.overview.value();
    if (!overview) {
      return [];
    }
    return paceOf(overview, mostReadGenre(this.cards.value() ?? [], this.tree.value() ?? []));
  });

  protected readonly plural = plural;

  protected ratingOf(rating: number | null | undefined): string | undefined {
    return rating == null
      ? undefined
      : rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  protected retry(): void {
    this.overview.reload();
    this.daily.reload();
    this.booksTime.reload();
  }
}
