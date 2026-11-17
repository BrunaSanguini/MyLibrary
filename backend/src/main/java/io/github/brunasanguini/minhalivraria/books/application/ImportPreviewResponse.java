package io.github.brunasanguini.minhalivraria.books.application;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * Everything the Open Library knows about an edition, shown before the user confirms the import.
 *
 * @param coverUrl address of the cover at the Open Library; nothing is downloaded before the confirmation
 * @param libraryBookId the book of the collection, when this edition or its ISBN-13 is already in it
 */
public record ImportPreviewResponse(
        String editionKey,
        @Nullable String workKey,
        String title,
        @Nullable String subtitle,
        List<String> authors,
        List<String> publishers,
        @Nullable Integer pageCount,
        @Nullable String isbn13,
        @Nullable String isbn10,
        @Nullable Short publishedYear,
        @Nullable String languageCode,
        @Nullable String synopsis,
        @Nullable String coverUrl,
        @Nullable Long libraryBookId) {}
