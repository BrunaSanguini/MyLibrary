import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './shared/components/header/header';
import { HeroSection } from './shared/components/hero-section/hero-section';
import { TopBooks } from './shared/components/top-books/top-books';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, HeroSection, TopBooks],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
