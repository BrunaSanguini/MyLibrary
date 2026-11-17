import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogApi } from '@core/api/catalog-api';
import { components } from '@core/api/schema';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Icon } from '@shared/ui/icon/icon';

type AuthorsPage = components['schemas']['PageResponseAuthorResponse'];

const SHOWN = 4;
/** The API serves at most this many per page, more than a personal shelf usually has. */
const LARGEST_PAGE = 100;

/**
 * Por autor: the authors with the most books, each with a fan of their covers. The catalog sorts
 * only by name, so the ranking is made here, over the first hundred authors.
 */
@Component({
  selector: 'ml-author-cards',
  imports: [BookCover, Icon, RouterLink],
  templateUrl: './author-cards.html',
  styleUrls: ['../home-section.css', '../card-fan.css'],
})
export class AuthorCards {
  private readonly catalogApi = inject(CatalogApi);

  protected readonly page = httpResource<AuthorsPage>(() =>
    this.catalogApi.listRequest('authors', undefined, 0, LARGEST_PAGE),
  );

  protected readonly authors = computed(() =>
    [...(this.page.value()?.content ?? [])]
      .filter((author) => author.bookCount > 0)
      .sort((one, other) => other.bookCount - one.bookCount)
      .slice(0, SHOWN),
  );
}
