import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppTitleStrategy } from './app-title-strategy';

@Component({ template: '' })
class EmptyPage {}

describe('AppTitleStrategy', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'estante', component: EmptyPage, title: 'Minha Estante' },
          { path: 'sem-titulo', component: EmptyPage },
        ]),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
      ],
    });
  });

  it('adds the app name after the page title', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/estante');

    expect(TestBed.inject(Title).getTitle()).toBe('Minha Estante · Minha Livraria');
  });

  it('uses only the app name when the page has no title', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/sem-titulo');

    expect(TestBed.inject(Title).getTitle()).toBe('Minha Livraria');
  });
});
