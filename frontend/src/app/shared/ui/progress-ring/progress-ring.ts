import { Component, computed, input } from '@angular/core';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Reading progress as a ring, from 0 to 100, with the percentage in the middle.
 *
 * <p>Like the progress bar, the host is the progressbar itself; the number in the middle is the
 * same value drawn for the eyes, so it is hidden from assistive technology.
 */
@Component({
  selector: 'ml-progress-ring',
  templateUrl: './progress-ring.html',
  styleUrl: './progress-ring.css',
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'percentage()',
    '[attr.aria-label]': 'label()',
  },
})
export class ProgressRing {
  readonly value = input.required<number>();
  readonly label = input('Progresso de leitura');

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;

  protected readonly percentage = computed(() =>
    Math.round(Math.min(Math.max(this.value(), 0), 100)),
  );

  /** How much of the stroke stays empty. */
  protected readonly offset = computed(() => CIRCUMFERENCE * (1 - this.percentage() / 100));
}
