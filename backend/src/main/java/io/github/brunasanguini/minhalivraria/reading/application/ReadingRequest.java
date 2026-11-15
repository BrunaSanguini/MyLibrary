package io.github.brunasanguini.minhalivraria.reading.application;

import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/**
 * Starts a reading or registers an old one. In progress needs the start; finished and abandoned need the end.
 *
 * @param reread "Esta é uma releitura"; false when absent
 */
public record ReadingRequest(
        @NotNull ReadingStatus status,
        @Nullable LocalDate startDate,
        @Nullable LocalDate endDate,
        @Nullable Boolean reread) {

    public boolean rereadOrDefault() {
        return Boolean.TRUE.equals(reread);
    }
}
