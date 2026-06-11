import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-hero-section',
  imports: [],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.scss',
})
export class HeroSection {

  @Input() layout: 'split' | 'right' | 'center' | 'auto' = 'split';

  @Input() backgroundImage: string = '';

  @Input() coverImage: string = '';

  @Input() title: string = '';

  @Input() author: string = '';

  @Input() synopsis: string = '';

  @Input() series?: string;
  
  @Input() volume?: number;

  @Input() genres: string[] = [];

}
