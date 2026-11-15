package io.github.brunasanguini.minhalivraria.books;

import org.jspecify.annotations.Nullable;

/**
 * What the other modules need to know about a book.
 *
 * @param pageCount unknown for books registered without it; a reading session needs it
 */
public record BookSummary(long id, String title, @Nullable Integer pageCount, @Nullable String coverUrl) {}
