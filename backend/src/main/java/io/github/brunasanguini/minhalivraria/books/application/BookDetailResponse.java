package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.domain.Ownership;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * The whole book page, apart from the readings and the review, which have their own endpoints
 * (docs/contrato-da-api.md).
 */
public record BookDetailResponse(
        long id,
        String title,
        @Nullable String subtitle,
        List<BookAuthorResponse> authors,
        @Nullable BookPublisherResponse publisher,
        @Nullable BookSeriesResponse series,
        List<BookGenreResponse> genres,
        @Nullable String isbn13,
        @Nullable String isbn10,
        @Nullable Integer pageCount,
        @Nullable Short publishedYear,
        @Nullable String languageCode,
        @Nullable String synopsis,
        Ownership ownership,
        boolean favorite,
        @Nullable String coverUrl,
        @Nullable String bannerUrl,
        @Nullable OpenLibraryResponse openLibrary,
        @Nullable Instant createdAt,
        @Nullable Instant updatedAt) {

    /** An author, in the order printed on the cover. */
    public record BookAuthorResponse(long id, String name) {}

    public record BookPublisherResponse(long id, String name) {}

    /** The series and where the book sits in it; {@code totalVolumes} feeds the "2 de 3" bar. */
    public record BookSeriesResponse(
            long id,
            String name,
            BigDecimal position,
            @Nullable Integer totalVolumes) {}

    /** {@code parentId} is null for a genre and points to the genre for a subgenre. */
    public record BookGenreResponse(
            long id, String name, @Nullable Long parentId) {}

    /** Where the book came from, when it was imported. */
    public record OpenLibraryResponse(
            @Nullable String workKey,
            @Nullable String editionKey,
            @Nullable String url) {}
}
