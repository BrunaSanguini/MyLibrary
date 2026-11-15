package io.github.brunasanguini.minhalivraria.books.application;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * One result of a search at the Open Library.
 *
 * @param editionKey what the preview and the confirmation of the import refer to
 * @param coverUrl address of the cover at the Open Library; nothing is downloaded before the confirmation
 * @param libraryBookId the book of the collection, when this edition is already in it
 */
public record ImportCandidateResponse(
        String editionKey,
        @Nullable String workKey,
        String title,
        List<String> authors,
        @Nullable Short publishedYear,
        @Nullable String coverUrl,
        @Nullable Long libraryBookId) {}
