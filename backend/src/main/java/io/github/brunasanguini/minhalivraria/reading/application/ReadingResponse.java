package io.github.brunasanguini.minhalivraria.reading.application;

import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/**
 * @param startDate missing only in old readings registered with just the end
 * @param endDate missing while the reading is in progress
 */
public record ReadingResponse(
        long id,
        long bookId,
        ReadingStatus status,
        @Nullable LocalDate startDate,
        @Nullable LocalDate endDate,
        boolean reread,
        ProgressResponse progress,
        int sessionCount) {}
