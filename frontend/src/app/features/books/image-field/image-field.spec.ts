import { fireEvent, render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ImageField } from './image-field';

const PNG = new File(['png'], 'capa.png', { type: 'image/png' });
const GIF = new File(['gif'], 'anim.gif', { type: 'image/gif' });

/** jsdom has neither blob URLs nor DataTransfer; the field only needs files on the event. */
function transferOf(...files: File[]) {
  return { files, types: ['Files'] };
}

beforeAll(() => {
  URL.createObjectURL ??= () => 'blob:prévia';
  URL.revokeObjectURL ??= () => undefined;
});

async function renderField(currentUrl?: string) {
  const fileChange = vi.fn();
  const removeChange = vi.fn();
  await render(ImageField, {
    inputs: {
      label: 'Capa',
      currentUrl,
      placeholderTitle: 'Duna',
      placeholderAuthor: 'Frank Herbert',
    },
    on: { fileChange, removeChange },
  });
  return { fileChange, removeChange, area: screen.getByRole('group', { name: /^Capa:/ }) };
}

describe('ImageField', () => {
  it('takes an image pasted on the area and shows it', async () => {
    const { fileChange, area } = await renderField();

    fireEvent.paste(area, { clipboardData: transferOf(PNG) });

    expect(fileChange).toHaveBeenCalledWith(PNG);
    expect(await screen.findByRole('img', { name: 'Prévia: Capa' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Nova imagem: colada da área de transferência',
    );
  });

  it('takes an image dropped on the area', async () => {
    const { fileChange, area } = await renderField();

    fireEvent.drop(area, { dataTransfer: transferOf(PNG) });

    expect(fileChange).toHaveBeenCalledWith(PNG);
    expect(screen.getByRole('status')).toHaveTextContent('Nova imagem: capa.png');
  });

  it('refuses a pasted image of another type', async () => {
    const { fileChange, area } = await renderField();

    fireEvent.paste(area, { clipboardData: transferOf(GIF) });

    expect(fileChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Use uma imagem JPEG, PNG ou WebP.');
  });

  it('drops the new image with "Remover capa" and shows the saved one again', async () => {
    const { fileChange, area } = await renderField('/images/capa.jpg');

    fireEvent.paste(area, { clipboardData: transferOf(PNG) });
    await userEvent.click(screen.getByRole('button', { name: 'Remover capa' }));

    expect(fileChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByRole('img', { name: 'Prévia: Capa' })).toHaveAttribute(
      'src',
      '/images/capa.jpg',
    );
  });

  it('asks to remove the saved image, and draws the cover instead', async () => {
    const { removeChange } = await renderField('/images/capa.jpg');

    await userEvent.click(screen.getByRole('button', { name: 'Remover capa' }));

    expect(removeChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('img', { name: 'Prévia: Capa' })).not.toBeInTheDocument();
    expect(screen.getByText(/o Ex·Libru desenha uma capa/)).toBeInTheDocument();
  });

  it('cannot remove a cover that is not there', async () => {
    await renderField();

    expect(screen.getByRole('button', { name: 'Remover capa' })).toBeDisabled();
    expect(screen.getByText('Duna')).toBeInTheDocument();
  });

  it('keeps the file field, named by the label', async () => {
    const { fileChange } = await renderField();

    await userEvent.upload(screen.getByLabelText('Capa'), PNG);

    expect(fileChange).toHaveBeenCalledWith(PNG);
  });
});
