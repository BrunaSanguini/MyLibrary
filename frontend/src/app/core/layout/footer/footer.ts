import { Component } from '@angular/core';
import { ExLibrisSeal } from '@shared/ui/ex-libris-seal/ex-libris-seal';
import { Wordmark } from '@shared/ui/wordmark/wordmark';

/** The signature at the end of every page: the ex-libris seal, the name and the motto. Static. */
@Component({
  selector: 'ml-footer',
  imports: [ExLibrisSeal, Wordmark],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {}
