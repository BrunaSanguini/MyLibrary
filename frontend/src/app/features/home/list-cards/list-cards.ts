import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListsApi, ListsPage } from '@core/api/lists-api';
import { Icon } from '@shared/ui/icon/icon';
import { ListCovers } from '@shared/ui/list-covers/list-covers';

const SHOWN = 3;

/**
 * Listas para explorar: the three lists changed last, pinned or not, each with its fan of covers
 * and how many books it has and how many were read.
 */
@Component({
  selector: 'ml-list-cards',
  imports: [Icon, ListCovers, RouterLink],
  templateUrl: './list-cards.html',
  styleUrls: ['../home-section.css', './list-cards.css'],
})
export class ListCards {
  private readonly listsApi = inject(ListsApi);

  protected readonly page = httpResource<ListsPage>(() =>
    this.listsApi.listRequest(0, SHOWN, 'updatedAt'),
  );
}
