import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One step of the trail; the last one is the page itself and has no link. */
export interface Crumb {
  readonly label: string;
  readonly link?: string | readonly (string | number)[];
}

/**
 * Where the page sits in the app ("Estante › Dom Casmurro › Editar"). The trail is fixed per page,
 * not the history of where the reader came from.
 */
@Component({
  selector: 'ml-breadcrumbs',
  imports: [RouterLink],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.css',
})
export class Breadcrumbs {
  readonly items = input.required<readonly Crumb[]>();
}
