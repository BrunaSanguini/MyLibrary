package io.github.brunasanguini.minhalivraria.shelf.application;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * Filters of {@code GET /shelf/books}, all optional and combined with AND.
 *
 * @param q accent-insensitive term, matched against title, subtitle and author names
 * @param statuses any of them; empty or null means every status
 * @param genreId a genre also brings the books of its subgenres
 */
public record ShelfFilter(
        @Nullable String q,
        @Nullable List<ShelfStatus> statuses,
        @Nullable Ownership ownership,
        @Nullable Boolean favorite,
        @Nullable Long genreId,
        @Nullable Long authorId,
        @Nullable Long publisherId,
        @Nullable Long seriesId) {}
