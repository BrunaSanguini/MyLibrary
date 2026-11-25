package io.github.brunasanguini.minhalivraria.reading.application;

import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/**
 * @param startDate missing only in old readings registered with just the end
 * @param endDate missing while the reading is in progress
 * @param rating the rating of the book given in this reading, when it has one
 */
public record ReadingResponse(
        long id,
        long bookId,
        ReadingStatus status,
        @Nullable LocalDate startDate,
        @Nullable LocalDate endDate,
        boolean reread,
        ProgressResponse progress,
        int sessionCount,
        @Nullable BigDecimal rating) {

    public ReadingResponse(
            long id,
            long bookId,
            ReadingStatus status,
            @Nullable LocalDate startDate,
            @Nullable LocalDate endDate,
            boolean reread,
            ProgressResponse progress,
            int sessionCount) {
        this(id, bookId, status, startDate, endDate, reread, progress, sessionCount, null);
    }
}
