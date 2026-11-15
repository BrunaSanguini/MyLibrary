package io.github.brunasanguini.minhalivraria.reading.application;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/**
 * @param pagesRead always the pages of the day, also when the session was sent as "current page"
 */
public record SessionResponse(
        long id, LocalDate date, int pagesRead, @Nullable String note) {}
