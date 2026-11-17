package io.github.brunasanguini.minhalivraria.reading.application;

/**
 * The reading finished in the fewest days.
 *
 * @param days from the first to the last day, both included: a book started and finished on the same day took 1
 */
public record FastestReadingResponse(long bookId, String title, int days) {}
