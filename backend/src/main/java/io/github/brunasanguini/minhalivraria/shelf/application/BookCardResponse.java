package io.github.brunasanguini.minhalivraria.shelf.application;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import java.math.BigDecimal;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * The book card every listing shows (docs/contrato-da-api.md). Status, progress and rating join it in Marco 3, with
 * the reading module.
 */
public record BookCardResponse(
        long id,
        String title,
        List<String> authors,
        @Nullable String coverUrl,
        List<String> genres,
        Ownership ownership,
        boolean favorite,
        @Nullable CardSeriesResponse series) {

    /** Where the book sits in its series, so the card can show "1 de 3". */
    public record CardSeriesResponse(long id, String name, BigDecimal position) {}
}
