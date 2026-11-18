import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { App } from './app';

@Component({ template: '' })
class Blank {}

describe('App', () => {
  it('floats the header over the hero only on the Home', async () => {
    const view = await render(App, {
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: 'estante', component: Blank },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/?x=1');
    view.fixture.detectChanges();
    expect(view.fixture.nativeElement).toHaveClass('over-hero');

    await router.navigateByUrl('/estante');
    view.fixture.detectChanges();
    expect(view.fixture.nativeElement).not.toHaveClass('over-hero');
  });
});
