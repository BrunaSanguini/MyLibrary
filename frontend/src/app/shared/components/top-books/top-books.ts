import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

export interface TopBook {
  rank: 1 | 2 | 3;
  title: string;
  author: string;
  cover: string;
  slug: string;
}

@Component({
  selector: 'app-top-books',
  imports: [NgClass],
  templateUrl: './top-books.html',
  styleUrl: './top-books.scss',
})
export class TopBooks {
  @Input() books: TopBook[] = [];

  getRankStyle(rank: 1 | 2 | 3) {
    const styles = {
      1: {
        badge: 'bg-amber-400 text-black',
        glow: 'group-hover:shadow-[0_0_60px_-5px_rgba(251,191,36,0.55)]',
        ring: 'ring-amber-400/40',
      },
      2: {
        badge: 'bg-zinc-300 text-black',
        glow: 'group-hover:shadow-[0_0_50px_-8px_rgba(212,212,216,0.45)]',
        ring: 'ring-zinc-300/40',
      },
      3: {
        badge: 'bg-amber-700 text-amber-50',
        glow: 'group-hover:shadow-[0_0_50px_-8px_rgba(180,83,9,0.5)]',
        ring: 'ring-amber-700/40',
      },
    };
    return styles[rank];
  }

  navigateToBook(slug: string) {
    window.location.href = `/livros/${slug}`;
  }
}