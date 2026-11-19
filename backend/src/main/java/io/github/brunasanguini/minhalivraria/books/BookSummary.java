package io.github.brunasanguini.minhalivraria.books;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * What the other modules need to know about a book.
 *
 * @param pageCount unknown for books registered without it; a reading session needs it
 * @param authors in the order printed on the cover
 * @param ownership whether the book is on the shelf, on the wish list, or neither
 */
public record BookSummary(
        long id,
        String title,
        @Nullable Integer pageCount,
        @Nullable String coverUrl,
        List<String> authors,
        Ownership ownership) {}
