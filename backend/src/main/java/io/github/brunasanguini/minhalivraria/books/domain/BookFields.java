package io.github.brunasanguini.minhalivraria.books.domain;

import org.jspecify.annotations.Nullable;

/**
 * The book's own data, apart from the catalog links and the images. Grouped so {@link Book} takes one argument
 * instead of ten, and so creating and editing share the same shape.
 *
 * <p>ISBNs arrive as the user typed them; {@link Book} keeps only the digits.
 */
public record BookFields(
        String title,
        @Nullable String subtitle,
        @Nullable String isbn13,
        @Nullable String isbn10,
        @Nullable Integer pageCount,
        @Nullable Short publishedYear,
        @Nullable String languageCode,
        @Nullable String synopsis,
        Ownership ownership,
        boolean favorite) {}
