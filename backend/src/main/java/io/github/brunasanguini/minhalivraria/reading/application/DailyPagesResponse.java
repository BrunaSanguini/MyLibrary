package io.github.brunasanguini.minhalivraria.reading.application;

import java.time.LocalDate;

/** The pages of every session of one day. Days without reading are not listed. */
public record DailyPagesResponse(LocalDate date, int pages) {}
