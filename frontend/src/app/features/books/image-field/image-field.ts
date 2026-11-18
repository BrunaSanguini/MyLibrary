import { Component, computed, effect, input, OnDestroy, output, signal } from '@angular/core';
import { Button } from '@shared/ui/button/button';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_LIMIT = 5 * 1024 * 1024;

let nextId = 0;

/**
 * A cover or banner of the book, chosen three ways: the file field, an image dragged onto the
 * area or an image pasted from the clipboard (Ctrl+V with the area focused, or the "Colar imagem"
 * button). The image is only checked here (type and size) and shown before it is saved; the form
 * sends it once the book is saved. The name of the file does not matter: the app saves every
 * image under a name of its own.
 */
@Component({
  selector: 'ml-image-field',
  imports: [Button],
  templateUrl: './image-field.html',
  styleUrl: './image-field.css',
})
export class ImageField implements OnDestroy {
  /** "Capa" or "Banner": names the file field, so the area is reached by it. */
  readonly label = input.required<string>();
  /** The saved image, when there is one. */
  readonly currentUrl = input<string | undefined>();
  readonly shape = input<'cover' | 'banner'>('cover');

  /** The new image, or undefined when it was taken back. */
  readonly fileChange = output<File | undefined>();
  /** Asks to remove the saved image. */
  readonly removeChange = output<boolean>();

  protected readonly id = `ml-image-field-${nextId++}`;
  protected readonly canReadClipboard =
    typeof navigator !== 'undefined' && typeof navigator.clipboard?.read === 'function';

  protected readonly file = signal<File | undefined>(undefined);
  protected readonly remove = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly dragging = signal(false);
  /** A pasted image has no name of its own (the browser calls it image.png). */
  protected readonly pasted = signal(false);
  private readonly fileUrl = signal<string | undefined>(undefined);

  protected readonly preview = computed(() => {
    if (this.fileUrl()) {
      return this.fileUrl();
    }
    return this.remove() ? undefined : this.currentUrl();
  });

  constructor() {
    // Each preview of a chosen file is a blob URL, released when the file changes.
    effect((onCleanup) => {
      const file = this.file();
      if (!file) {
        this.fileUrl.set(undefined);
        return;
      }
      const url = URL.createObjectURL(file);
      this.fileUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  ngOnDestroy(): void {
    this.file.set(undefined);
  }

  protected chooseFromField(event: Event): void {
    const field = event.target as HTMLInputElement;
    const file = field.files?.[0];
    if (file && !this.accept(file, false)) {
      field.value = '';
    }
  }

  protected paste(event: ClipboardEvent): void {
    const file = imageOf(event.clipboardData?.files);
    if (file) {
      event.preventDefault();
      this.accept(file, true);
    } else if (event.clipboardData?.types.includes('Files')) {
      event.preventDefault();
      this.error.set('Use uma imagem JPEG, PNG ou WebP.');
    }
  }

  protected async pasteFromClipboard(): Promise<void> {
    this.error.set(undefined);
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((candidate) => IMAGE_TYPES.includes(candidate));
        if (type) {
          const blob = await item.getType(type);
          this.accept(new File([blob], `imagem.${type.split('/')[1]}`, { type }), true);
          return;
        }
      }
      this.error.set('Não há imagem copiada. Copie uma imagem e tente de novo.');
    } catch {
      this.error.set('O navegador não deixou ler o que foi copiado. Use Ctrl+V na área.');
    }
  }

  protected dragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
      this.dragging.set(true);
    }
  }

  protected drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.accept(file, false);
    }
  }

  protected undo(): void {
    this.file.set(undefined);
    this.error.set(undefined);
    this.fileChange.emit(undefined);
  }

  protected toggleRemoval(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.remove.set(checked);
    this.removeChange.emit(checked);
  }

  /** Keeps the image when it is one the API takes; otherwise says why. */
  private accept(file: File, pasted: boolean): boolean {
    this.error.set(undefined);
    if (!IMAGE_TYPES.includes(file.type)) {
      this.error.set('Use uma imagem JPEG, PNG ou WebP.');
      return false;
    }
    if (file.size > IMAGE_LIMIT) {
      this.error.set('A imagem pode ter até 5 MB.');
      return false;
    }
    this.pasted.set(pasted);
    this.file.set(file);
    this.fileChange.emit(file);
    return true;
  }
}

function imageOf(files: FileList | undefined): File | undefined {
  return Array.from(files ?? []).find((file) => IMAGE_TYPES.includes(file.type));
}
