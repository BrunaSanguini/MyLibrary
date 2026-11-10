package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.domain.Ownership;
import io.github.brunasanguini.minhalivraria.shared.validation.Isbn10;
import io.github.brunasanguini.minhalivraria.shared.validation.Isbn13;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * The book as the form sends it. The catalog is referenced by id: when the user types a new name, the front-end
 * creates the author, publisher, series or genre first and sends the id that came back.
 *
 * <p>Series and position travel together; one without the other is {@code book.series-position-required}.
 */
public record BookRequest(
        @NotBlank @Size(max = 500) String title,
        @Size(max = 500) @Nullable String subtitle,
        @Isbn13 @Nullable String isbn13,
        @Isbn10 @Nullable String isbn10,
        @Positive @Nullable Integer pageCount,
        @Min(1) @Max(2999) @Nullable Short publishedYear,
        @Pattern(regexp = "[a-z]{3}", message = "{io.github.brunasanguini.minhalivraria.validation.languageCode.message}")
                @Nullable String languageCode,
        @Size(max = 10_000) @Nullable String synopsis,
        @Nullable List<Long> authorIds,
        @Nullable Long publisherId,
        @Nullable List<Long> genreIds,
        @Nullable Long seriesId,
        @DecimalMin(value = "0.1") @Digits(integer = 3, fraction = 1) @Nullable BigDecimal seriesPosition,
        @Nullable Ownership ownership,
        @Nullable Boolean favorite) {

    public Ownership ownershipOrDefault() {
        return ownership == null ? Ownership.NONE : ownership;
    }

    public boolean favoriteOrDefault() {
        return favorite != null && favorite;
    }

    public List<Long> authorIdsOrEmpty() {
        return authorIds == null ? List.of() : authorIds;
    }

    public List<Long> genreIdsOrEmpty() {
        return genreIds == null ? List.of() : genreIds;
    }
}
