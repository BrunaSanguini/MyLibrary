package io.github.brunasanguini.minhalivraria.lists.application;

import org.jspecify.annotations.Nullable;

/**
 * Filters of {@code GET /lists}, all optional and combined with AND.
 *
 * @param q accent-insensitive term, matched against the name
 * @param status how far the reading of the list is
 * @param pinned {@code true} for the pinned list only, {@code false} for all the others
 */
public record ListFilter(@Nullable String q, @Nullable ListStatus status, @Nullable Boolean pinned) {

    /** No filter at all. */
    public static ListFilter none() {
        return new ListFilter(null, null, null);
    }
}
