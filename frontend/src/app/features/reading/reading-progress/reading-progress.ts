import { Component, computed, input } from '@angular/core';

/** The radius of the arc in the 240×240 ring. */
const RADIUS = 102;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function pagesText(pages: number): string {
  return pages === 1 ? '1 página' : `${pages.toLocaleString('pt-BR')} páginas`;
}

/**
 * Progresso do livro (spec R.3): the ring with the pages read, the percentage, what is left and
 * when the book should end at the pace of the week.
 */
@Component({
  selector: 'ml-reading-progress',
  templateUrl: './reading-progress.html',
  styleUrl: './reading-progress.css',
})
export class ReadingProgress {
  readonly pagesRead = input.required<number>();
  readonly pageCount = input<number | undefined>();
  /** Pages per day of the week shown, which drives the forecast. */
  readonly average = input(0);

  protected readonly radius = RADIUS;

  protected readonly percent = computed(() => {
    const total = this.pageCount();
    return total ? Math.min(100, Math.round((this.pagesRead() / total) * 100)) : 0;
  });

  protected readonly dash = computed(
    () => `${(CIRCUMFERENCE * this.percent()) / 100} ${CIRCUMFERENCE}`,
  );

  protected readonly left = computed(() => {
    const total = this.pageCount();
    return total === undefined ? undefined : Math.max(0, total - this.pagesRead());
  });

  /** `Faltam 192 páginas`, `Falta 1 página` or `Livro concluído!`. */
  protected readonly headline = computed(() => {
    const left = this.left();
    if (left === undefined) {
      return 'Sem o número de páginas do livro';
    }
    if (left === 0) {
      return 'Livro concluído!';
    }
    return left === 1 ? 'Falta 1 página' : `Faltam ${pagesText(left)}`;
  });

  /** `No seu ritmo de 28 páginas por dia, você termina em cerca de 7 dias.` */
  protected readonly forecast = computed(() => {
    const left = this.left();
    const average = this.average();
    if (left === undefined) {
      return 'Cadastre o número de páginas para acompanhar o progresso.';
    }
    if (left === 0) {
      return 'Você chegou à última página. É só marcar “Terminei este livro”.';
    }
    if (average <= 0) {
      return undefined;
    }
    const days = Math.ceil(left / average);
    const pace = average === 1 ? '1 página' : `${average} páginas`;
    return `No seu ritmo de ${pace} por dia, você termina em cerca de ${
      days === 1 ? '1 dia' : `${days} dias`
    }.`;
  });
}
