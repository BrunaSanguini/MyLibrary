import { maxLength, required, SchemaPathTree, validate } from '@angular/forms/signals';
import { ImportRequest } from '@core/api/import-api';
import { Ownership } from '@core/api/shelf-api';

import { seriesPositionError } from '../book-form-page/book-form';
import type { GenreEntry } from '../genre-fields/genre-fields';

/** The search field. Whether the text is an ISBN or a title is decided when it reaches the URL. */
export interface ImportSearchModel {
  query: string;
}

export function importSearchSchema(search: SchemaPathTree<ImportSearchModel>): void {
  required(search.query, { message: 'Digite um título, um autor ou um ISBN.' });
  maxLength(search.query, 200, { message: 'A busca tem no máximo 200 caracteres.' });
}

/**
 * How the book is classified at the moment it is imported. All of it is optional: the data of
 * the book itself comes from the Open Library and is not edited here.
 */
export interface ImportClassificationModel {
  ownership: Ownership;
  genres: GenreEntry[];
  seriesId: number | null;
  seriesName: string;
  seriesPosition: number | null;
}

export function emptyClassification(): ImportClassificationModel {
  return { ownership: 'NONE', genres: [], seriesId: null, seriesName: '', seriesPosition: null };
}

export function importClassificationSchema(
  classification: SchemaPathTree<ImportClassificationModel>,
): void {
  validate(classification.seriesPosition, ({ value, valueOf }) =>
    seriesPositionError(valueOf(classification.seriesId) !== null, value()),
  );
}

export function importRequestOf(
  editionKey: string,
  model: ImportClassificationModel,
): ImportRequest {
  return {
    editionKey,
    ownership: model.ownership,
    genreIds: model.genres.map((genre) => genre.id),
    seriesId: model.seriesId ?? undefined,
    seriesPosition: model.seriesPosition ?? undefined,
  };
}
