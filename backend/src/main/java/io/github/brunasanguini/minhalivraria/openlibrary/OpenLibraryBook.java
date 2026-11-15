package io.github.brunasanguini.minhalivraria.openlibrary;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * An edition with the inconsistencies of the Open Library already solved: the description is always text, the
 * publication date is a year and the language is a three-letter code.
 *
 * @param editionKey such as {@code OL51694024M}
 * @param workKey such as {@code OL27448W}
 * @param languageCode ISO 639-2, such as {@code por}
 * @param coverId id of the cover at the Open Library, when there is one
 */
public record OpenLibraryBook(
        String editionKey,
        @Nullable String workKey,
        String title,
        @Nullable String subtitle,
        List<OpenLibraryAuthor> authors,
        @Nullable String publisher,
        @Nullable Integer pageCount,
        @Nullable String isbn13,
        @Nullable String isbn10,
        @Nullable Short publishedYear,
        @Nullable String languageCode,
        @Nullable String description,
        @Nullable Long coverId) {}
