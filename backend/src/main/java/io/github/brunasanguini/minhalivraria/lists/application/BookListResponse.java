package io.github.brunasanguini.minhalivraria.lists.application;

import java.time.Instant;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * A list as its card shows it.
 *
 * @param readCount how many of its books have at least one finished reading
 * @param coverUrls the covers of its first books that have one, at most three
 */
public record BookListResponse(
        long id,
        String name,
        @Nullable String description,
        int bookCount,
        int readCount,
        List<String> coverUrls,
        Instant updatedAt) {}
