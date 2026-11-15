package io.github.brunasanguini.minhalivraria.reading.application;

import org.jspecify.annotations.Nullable;

/**
 * How far a reading went.
 *
 * @param pagesRead sum of the pages of its sessions
 * @param pageCount pages of the book, when it has them
 * @param percent from 0 to 100, rounded down; a finished reading is always 100
 */
public record ProgressResponse(int pagesRead, @Nullable Integer pageCount, int percent) {

    private static final int COMPLETE = 100;

    static ProgressResponse of(int pagesRead, @Nullable Integer pageCount, boolean finished) {
        if (finished) {
            return new ProgressResponse(pagesRead, pageCount, COMPLETE);
        }
        if (pageCount == null || pageCount <= 0) {
            return new ProgressResponse(pagesRead, pageCount, 0);
        }
        return new ProgressResponse(
                pagesRead, pageCount, (int) Math.min(COMPLETE, (long) pagesRead * COMPLETE / pageCount));
    }
}
