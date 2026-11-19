import { Component } from '@angular/core';

/**
 * The name of the brand, EX·LIBRU: "EX" and "LI" in the text color, the dot in the accent color
 * and "BRU" in the gold text color. The size and the spacing come from the place where it is used.
 *
 * <p>Drawn letter by letter, so the name for screen readers is a plain "Ex·Libru".
 */
@Component({
  selector: 'ml-wordmark',
  templateUrl: './wordmark.html',
  styleUrl: './wordmark.css',
})
export class Wordmark {}
