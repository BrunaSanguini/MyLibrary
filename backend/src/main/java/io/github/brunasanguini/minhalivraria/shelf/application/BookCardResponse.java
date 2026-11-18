package io.github.brunasanguini.minhalivraria.shelf.application;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import java.math.BigDecimal;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * The book card every listing shows (docs/contrato-da-api.md).
 *
 * @param progress only while the book has a reading in progress
 * @param rating only when the book has a review with a rating
 * @param publishedYear the year of the edition, when known
 */
public record BookCardResponse(
        long id,
        String title,
        List<String> authors,
        @Nullable String coverUrl,
        ShelfStatus status,
        @Nullable CardProgressResponse progress,
        @Nullable BigDecimal rating,
        List<String> genres,
        Ownership ownership,
        boolean favorite,
        @Nullable CardSeriesResponse series,
        @Nullable Short publishedYear) {

    /**
     * How far the reading in progress went.
     *
     * @param pageCount pages of the book, when it has them
     * @param percent from 0 to 100, rounded down
     */
    public record CardProgressResponse(
            int pagesRead, @Nullable Integer pageCount, int percent) {}

    /** Where the book sits in its series, so the card can show "1 de 3". */
    public record CardSeriesResponse(long id, String name, BigDecimal position) {}
}
