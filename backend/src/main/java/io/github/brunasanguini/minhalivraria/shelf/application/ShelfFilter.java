package io.github.brunasanguini.minhalivraria.shelf.application;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * Filters of {@code GET /shelf/books}, all optional and combined with AND.
 *
 * @param q accent-insensitive term, matched against title, subtitle, author names and the series name
 * @param statuses any of them; empty or null means every status
 * @param listId only the books of this list; it is also what lets the listing be sorted by {@code listOrder}
 * @param reread read more than once, or with a reading marked as a reread
 * @param genreId a genre also brings the books of its subgenres
 * @param wishlist true keeps only the wishlist; false leaves it out, which is what Minha Estante shows by default
 */
public record ShelfFilter(
        @Nullable String q,
        @Nullable List<ShelfStatus> statuses,
        @Nullable Ownership ownership,
        @Nullable Boolean favorite,
        @Nullable Boolean reread,
        @Nullable Long genreId,
        @Nullable Long authorId,
        @Nullable Long publisherId,
        @Nullable Long seriesId,
        @Nullable Long listId,
        @Nullable Boolean wishlist) {}
