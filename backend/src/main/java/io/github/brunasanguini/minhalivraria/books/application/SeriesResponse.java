package io.github.brunasanguini.minhalivraria.books.application;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * A series, with the book count and up to three covers for the Catálogos card. {@code totalVolumes} is how many
 * volumes the series has in all, which can be more than the books registered.
 */
public record SeriesResponse(
        long id,
        String name,
        @Nullable Integer totalVolumes,
        long bookCount,
        List<String> coverUrls,
        @Nullable String description) {

    public SeriesResponse(long id, String name, @Nullable Integer totalVolumes, @Nullable String description) {
        this(id, name, totalVolumes, 0, List.of(), description);
    }
}
