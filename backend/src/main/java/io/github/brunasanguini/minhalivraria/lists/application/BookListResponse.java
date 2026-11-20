package io.github.brunasanguini.minhalivraria.lists.application;

import io.github.brunasanguini.minhalivraria.lists.domain.ListColor;
import java.time.Instant;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * A list as its card shows it.
 *
 * @param pinned the list shown in the highlight of the Lists page; at most one list is pinned
 * @param bookCount all the books of the list, the ones on the wish list included
 * @param readCount how many of its books have at least one finished reading
 * @param wishlistCount how many of its books are on the wish list, that is, not in the collection yet
 * @param status {@code NOT_STARTED} with no book read, {@code COMPLETED} with all of them read
 * @param coverUrls the covers of its first books that have one, at most three
 * @param updatedAt when the list was edited or had a book added, removed or moved; pinning does not count
 */
public record BookListResponse(
        long id,
        String name,
        @Nullable String description,
        ListColor color,
        boolean pinned,
        int bookCount,
        int readCount,
        int wishlistCount,
        ListStatus status,
        List<String> coverUrls,
        Instant updatedAt) {}
