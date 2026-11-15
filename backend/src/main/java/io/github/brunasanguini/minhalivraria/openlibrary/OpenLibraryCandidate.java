package io.github.brunasanguini.minhalivraria.openlibrary;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * One result of a search: enough to recognize the book and ask for its edition.
 *
 * @param editionKey the edition a preview or an import refers to, such as {@code OL51694024M}
 * @param workKey the work the edition belongs to, such as {@code OL27448W}
 * @param coverId id of the cover at the Open Library, when there is one
 */
public record OpenLibraryCandidate(
        String editionKey,
        @Nullable String workKey,
        String title,
        List<String> authors,
        @Nullable Short publishedYear,
        @Nullable Long coverId) {}
