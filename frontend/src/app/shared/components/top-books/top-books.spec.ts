import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopBooks } from './top-books';

describe('TopBooks', () => {
  let component: TopBooks;
  let fixture: ComponentFixture<TopBooks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopBooks],
    }).compileComponents();

    fixture = TestBed.createComponent(TopBooks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
