import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {

  @Input() theme: 'light' | 'dark' | 'colored' = 'light';

  searchOpen: boolean = false;

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
  }

  goToLogin(): void {
  }

}
