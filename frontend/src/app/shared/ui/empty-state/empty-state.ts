import { Component, input } from '@angular/core';

import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Nothing to show, and that is fine: an empty shelf, a filter with no match, a list yet to fill.
 *
 * <p>The action is projected, so each screen offers whatever makes sense there ("Adicionar livro",
 * "Limpar filtros") without this component knowing about routing.
 */
@Component({
  selector: 'ml-empty-state',
  imports: [Icon],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly icon = input<IconName>('shelf');
}
