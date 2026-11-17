import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListsApi, ListsPage } from '@core/api/lists-api';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Icon } from '@shared/ui/icon/icon';

const SHOWN = 3;

/** Listas para explorar: the lists changed last, with their covers and how much was read. */
@Component({
  selector: 'ml-list-cards',
  imports: [BookCover, Icon, RouterLink],
  templateUrl: './list-cards.html',
  styleUrls: ['../home-section.css', '../card-fan.css'],
})
export class ListCards {
  private readonly listsApi = inject(ListsApi);

  protected readonly page = httpResource<ListsPage>(() =>
    this.listsApi.listRequest(0, SHOWN, 'updatedAt'),
  );
}
