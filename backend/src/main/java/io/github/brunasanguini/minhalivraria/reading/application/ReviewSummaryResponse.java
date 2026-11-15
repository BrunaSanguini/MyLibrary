package io.github.brunasanguini.minhalivraria.reading.application;

import java.math.BigDecimal;
import java.time.Instant;
import org.jspecify.annotations.Nullable;

/**
 * A review in the list of the latest ones, with enough of the book to show it.
 *
 * @param excerpt the beginning of the text, cut at a word
 */
public record ReviewSummaryResponse(
        long bookId,
        String title,
        @Nullable String coverUrl,
        @Nullable BigDecimal rating,
        @Nullable String excerpt,
        Instant updatedAt) {}
