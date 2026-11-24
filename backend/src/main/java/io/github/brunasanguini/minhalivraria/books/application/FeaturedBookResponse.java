package io.github.brunasanguini.minhalivraria.books.application;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * A book featured on the Home.
 *
 * @param slot 1 to 3, the order on the Home
 * @param imageUrl the image of the slot, shown behind the book; absent until one is sent
 */
public record FeaturedBookResponse(
        int slot,
        long bookId,
        String title,
        List<String> authors,
        @Nullable String coverUrl,
        @Nullable String imageUrl) {}
