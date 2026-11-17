package io.github.brunasanguini.minhalivraria.reading.application;

import org.jspecify.annotations.Nullable;

/**
 * How much of a period went to one book.
 *
 * @param days days with at least one session of the book
 * @param pages pages of those sessions
 */
public record BookTimeResponse(
        long bookId, String title, @Nullable String coverUrl, int days, int pages) {}
