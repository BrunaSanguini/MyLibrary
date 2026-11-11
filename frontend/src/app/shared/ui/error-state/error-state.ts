import { Component, input, output } from '@angular/core';

import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * Something failed and the person can try again.
 *
 * <p>`role="alert"` so the failure is announced when it replaces the content. The message comes
 * from the Problem Details `detail` of the API, which is already written in Portuguese.
 */
@Component({
  selector: 'ml-error-state',
  imports: [Button, Icon],
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
  host: {
    role: 'alert',
  },
})
export class ErrorState {
  readonly title = input('Não foi possível carregar');
  readonly message = input<string>();

  readonly retry = output<void>();
}
