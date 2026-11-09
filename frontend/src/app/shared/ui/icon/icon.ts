import { Component, computed, input } from '@angular/core';

import { IconDefinition, IconName, ICONS } from './icons';

/**
 * Decorative icon: always hidden from assistive technology.
 * An icon-only button carries the accessible name in its own aria-label.
 */
@Component({
  selector: 'ml-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);

  protected readonly icon = computed<IconDefinition>(() => ICONS[this.name()]);
}
