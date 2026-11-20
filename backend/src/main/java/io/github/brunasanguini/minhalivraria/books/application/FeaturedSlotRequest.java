package io.github.brunasanguini.minhalivraria.books.application;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.jspecify.annotations.Nullable;

/**
 * One featured book.
 *
 * @param imageFrom the slot, before the change, whose image this one keeps; absent leaves it without image
 */
public record FeaturedSlotRequest(
        @NotNull Long bookId, @Min(1) @Max(3) @Nullable Integer imageFrom) {}
