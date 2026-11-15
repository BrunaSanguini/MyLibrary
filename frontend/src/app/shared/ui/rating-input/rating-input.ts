import { Component, computed, input, model } from '@angular/core';

const MAX = 5;
const STEP = 0.5;

/**
 * Picks a rating from 1 to 5 in half points, or no rating at all.
 *
 * <p>Underneath the stars there is a native range input, which is what makes the keyboard and
 * screen readers work without any code here: the arrows move half a star, Home and End jump to
 * the ends, and `aria-valuetext` reads "3,5 de 5 estrelas" instead of a bare number. The left end
 * of the range is "no rating", so a rating can also be taken back.
 */
@Component({
  selector: 'ml-rating-input',
  templateUrl: './rating-input.html',
  styleUrl: './rating-input.css',
})
export class RatingInput {
  /** 1 to 5 in half points; undefined is "no rating". */
  readonly value = model<number | undefined>();
  /** Accessible name of the control, when no visible label points at {@link inputId}. */
  readonly label = input<string>();
  /** Id of the inner input, for a `<label for>` outside. */
  readonly inputId = input<string>();

  protected readonly max = MAX;
  protected readonly step = STEP;
  protected readonly stars = '★'.repeat(MAX);

  protected readonly percentage = computed(() => ((this.value() ?? 0) / MAX) * 100);

  protected readonly valueText = computed(() => {
    const value = this.value();
    if (value === undefined) {
      return 'Sem nota';
    }
    return `${value.toLocaleString('pt-BR')} de ${MAX} estrelas`;
  });

  protected change(event: Event): void {
    const picked = Number((event.target as HTMLInputElement).value);
    this.value.set(picked > 0 ? picked : undefined);
  }
}
