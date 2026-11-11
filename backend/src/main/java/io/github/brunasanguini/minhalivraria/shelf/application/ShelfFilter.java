package io.github.brunasanguini.minhalivraria.shelf.application;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import org.jspecify.annotations.Nullable;

/**
 * Filters of {@code GET /shelf/books}, all optional and combined with AND. Status, progress and rating join them in
 * Marco 3.
 *
 * @param q accent-insensitive term, matched against title, subtitle and author names
 * @param genreId a genre also brings the books of its subgenres
 */
public record ShelfFilter(
        @Nullable String q,
        @Nullable Ownership ownership,
        @Nullable Boolean favorite,
        @Nullable Long genreId,
        @Nullable Long authorId,
        @Nullable Long publisherId,
        @Nullable Long seriesId) {}
