import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Footer } from '@core/layout/footer/footer';
import { Header } from '@core/layout/header/header';

@Component({
  selector: 'ml-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: { '[class.over-hero]': 'home()' },
})
export class App {
  private readonly router = inject(Router);

  /** On the Home the header floats over the hero, which starts at the top of the window. */
  protected readonly home = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split(/[?#]/)[0] === '/'),
    ),
    { initialValue: false },
  );
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  /** A plain "#id" link would leave the current route because of <base href="/">. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.content().nativeElement.focus();
  }
}
