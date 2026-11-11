import { Directive, input } from '@angular/core';

/** Primary action, supporting action, action over the hero art, icon-only or inline action link. */
export type ButtonVariant = 'primary' | 'secondary' | 'hero' | 'hero-secondary' | 'icon' | 'link';

/**
 * Styles a native `<button>` or `<a>` as a design system button.
 *
 * <p>A directive, not a wrapper: the host stays a real button or link, so forms, routing, the
 * keyboard and assistive technology keep working with nothing forwarded. An icon-only button
 * carries its own `aria-label`. The stylesheet is global (button.css, imported by styles.css),
 * because a directive has no view of its own to scope styles to.
 */
@Directive({
  selector: 'button[mlButton], a[mlButton]',
  host: {
    class: 'ml-button',
    '[attr.data-variant]': 'mlButton()',
  },
})
export class Button {
  /** Bare `mlButton` carries an empty string, which means the primary variant. */
  readonly mlButton = input<ButtonVariant, ButtonVariant | ''>('primary', {
    transform: (variant) => variant || 'primary',
  });
}
