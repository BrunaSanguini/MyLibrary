import { Component, ElementRef, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '@core/layout/header/header';

@Component({
  selector: 'ml-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  /** A plain "#id" link would leave the current route because of <base href="/">. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.content().nativeElement.focus();
  }
}
