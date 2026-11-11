import { Component, computed, input } from '@angular/core';

/**
 * Reading progress, from 0 to 100.
 *
 * <p>The host is the progressbar itself, so assistive technology reads the value from one element
 * instead of a wrapper around it.
 */
@Component({
  selector: 'ml-progress-bar',
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.css',
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'percentage()',
    '[attr.aria-label]': 'label()',
    '[attr.data-size]': 'size()',
  },
})
export class ProgressBar {
  readonly value = input.required<number>();
  readonly label = input('Progresso de leitura');
  /** `sm` is the 6px bar of the compact card; `md` the 8px one of the listing. */
  readonly size = input<'sm' | 'md'>('md');

  protected readonly percentage = computed(() =>
    Math.round(Math.min(Math.max(this.value(), 0), 100)),
  );
}
