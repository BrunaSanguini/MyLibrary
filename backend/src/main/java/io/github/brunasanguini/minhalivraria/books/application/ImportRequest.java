package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * Confirms the import of an edition. The data of the book comes from the Open Library; the request only says which
 * edition and, optionally, how to classify it right away. The series is always chosen by hand.
 */
public record ImportRequest(
        @NotBlank
        @Pattern(
                regexp = "OL\\d{1,20}M",
                message = "{io.github.brunasanguini.minhalivraria.validation.editionKey.message}")
        String editionKey,

        @Nullable Ownership ownership,
        @Nullable List<@NotNull Long> genreIds,
        @Nullable Long seriesId,

        @DecimalMin(value = "0.1") @Digits(integer = 3, fraction = 1) @Nullable
        BigDecimal seriesPosition) {

    public Ownership ownershipOrDefault() {
        return ownership == null ? Ownership.NONE : ownership;
    }

    public List<Long> genreIdsOrEmpty() {
        return genreIds == null ? List.of() : genreIds;
    }
}
