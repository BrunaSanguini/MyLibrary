package io.github.brunasanguini.minhalivraria.reading.application;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/** Corrects the dates and the reread mark of a reading. The status is not here: it changes by finish and abandon. */
public record ReadingPeriodRequest(
        @Nullable LocalDate startDate, @Nullable LocalDate endDate, @Nullable Boolean reread) {

    public boolean rereadOrDefault() {
        return Boolean.TRUE.equals(reread);
    }
}
