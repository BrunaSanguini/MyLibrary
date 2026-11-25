import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthorResponse } from '@core/api/catalog-api';
import { ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { Icon } from '@shared/ui/icon/icon';

/**
 * One author of Por autor: the name, how many books and how many of them were read, and a fan
 * of three covers at the foot of the card that opens when the card is pointed at or focused.
 */
@Component({
  selector: 'ml-author-card',
  imports: [Icon, RouterLink],
  templateUrl: './author-card.html',
  styleUrl: './author-card.css',
})
export class AuthorCard {
  readonly author = input.required<AuthorResponse>();

  private readonly shelfApi = inject(ShelfApi);

  /** One card of the read books is enough: the answer is totalElements. */
  private readonly read = httpResource<ShelfPage>(() =>
    this.shelfApi.booksRequest({ authorId: this.author().id, status: ['READ'], size: 1 }),
  );

  protected readonly books = computed(() => {
    const count = this.author().bookCount;
    return count === 1 ? '1 livro' : `${count} livros`;
  });

  protected readonly readCount = computed(() => {
    const count = this.read.value()?.totalElements;
    if (count === undefined) {
      return undefined;
    }
    return count === 1 ? '1 lido' : `${count} lidos`;
  });

  protected readonly front = computed(() => this.author().coverUrls[0]);
  protected readonly left = computed(() => this.author().coverUrls[1]);
  protected readonly right = computed(() => this.author().coverUrls[2]);
}
