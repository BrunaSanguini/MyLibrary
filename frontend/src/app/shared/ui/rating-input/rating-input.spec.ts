import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
// Real key presses of the browser: a synthetic keydown does not move a native range input.
import { userEvent } from 'vitest/browser';

import { RatingInput } from './rating-input';

async function setup(value?: number) {
  const view = await render(RatingInput, { inputs: { value, label: 'Nota' } });
  return { view, slider: screen.getByRole('slider', { name: 'Nota' }) };
}

describe('RatingInput', () => {
  it('starts without a rating and says so', async () => {
    const { slider } = await setup();

    expect(slider).toHaveValue('0');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sem nota');
  });

  it('announces the rating in stars, with the comma of pt-BR', async () => {
    const { slider } = await setup(3.5);

    expect(slider).toHaveValue('3.5');
    expect(slider).toHaveAttribute('aria-valuetext', '3,5 de 5 estrelas');
  });

  it('moves half a star with each arrow key', async () => {
    const { view, slider } = await setup(3);

    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(view.fixture.componentInstance.value()).toBe(3.5);

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(view.fixture.componentInstance.value()).toBe(2.5);
    expect(slider).toHaveAttribute('aria-valuetext', '2,5 de 5 estrelas');
  });

  it('jumps to the ends with Home and End', async () => {
    const { view, slider } = await setup(3);

    slider.focus();
    await userEvent.keyboard('{End}');
    expect(view.fixture.componentInstance.value()).toBe(5);

    await userEvent.keyboard('{Home}');
    expect(view.fixture.componentInstance.value()).toBeUndefined();
    expect(slider).toHaveAttribute('aria-valuetext', 'Sem nota');
  });

  it('takes the rating back when the arrows reach the left end', async () => {
    const { view, slider } = await setup(0.5);

    slider.focus();
    await userEvent.keyboard('{ArrowLeft}');

    expect(view.fixture.componentInstance.value()).toBeUndefined();
  });

  it('never goes past five stars', async () => {
    const { view, slider } = await setup(5);

    slider.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(view.fixture.componentInstance.value()).toBe(5);
  });

  it('fills the stars up to the rating', async () => {
    const { view } = await setup(4.5);

    const filled = view.container.querySelector<HTMLElement>('.filled')!;
    expect(filled.style.width).toBe('90%');
  });

  it('can be named by a label outside, through the id of its input', async () => {
    await render(`<label for="nota">Sua nota</label><ml-rating-input inputId="nota" />`, {
      imports: [RatingInput],
    });

    expect(screen.getByRole('slider', { name: 'Sua nota' })).toBeInTheDocument();
  });
});
