package io.github.brunasanguini.minhalivraria.books.application;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * The featured books, in the order of the Home.
 *
 * @param slots one to three
 */
public record FeaturedBooksRequest(
        @NotNull @Size(min = 1, max = 3) @Valid List<FeaturedSlotRequest> slots) {}
