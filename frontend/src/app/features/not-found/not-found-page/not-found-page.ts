import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@shared/ui/icon/icon';

@Component({
  selector: 'ml-not-found-page',
  imports: [RouterLink, Icon],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.css',
})
export default class NotFoundPage {}
