package io.github.brunasanguini.minhalivraria.reading.application;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/**
 * One day of reading. The two modes of the form are the two fields: exactly one of them comes filled in.
 *
 * @param pagesRead how many pages were read on the day
 * @param currentPage the page the reader stopped at, which the service converts into pages read
 */
public record SessionRequest(
        @NotNull LocalDate date,
        @Positive @Nullable Integer pagesRead,
        @Positive @Nullable Integer currentPage,
        @Size(max = 2000) @Nullable String note) {}
