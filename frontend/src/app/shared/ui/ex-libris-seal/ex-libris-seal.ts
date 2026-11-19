import { Component, input } from '@angular/core';

/** One arc id per seal: several seals can be on the same page, and an id cannot repeat. */
let nextArcId = 0;

/**
 * The ex-libris seal: a night-blue disc with a golden edge, the motto "Hic liber meus est" around a
 * pink star. It is decoration, except where a label says what it means (the "Tenho" seal of a book).
 */
@Component({
  selector: 'ml-ex-libris-seal',
  templateUrl: './ex-libris-seal.html',
  styleUrl: './ex-libris-seal.css',
  host: {
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
  },
})
export class ExLibrisSeal {
  /** Width and height in pixels. */
  readonly size = input(64);
  /** Tilt in degrees; the seal never sits straight. */
  readonly rotation = input(-10);
  /** Accessible name. Without it, the seal is hidden from assistive technology. */
  readonly label = input<string>();

  protected readonly arcId = `ml-seal-arc-${nextArcId++}`;
  protected readonly motto = 'HIC LIBER MEUS EST · EX LIBRIS ·';
}
