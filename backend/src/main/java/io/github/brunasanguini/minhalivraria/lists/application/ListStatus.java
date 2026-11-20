package io.github.brunasanguini.minhalivraria.lists.application;

/** How far the reading of a list is: none of its books read, some of them, or all of them. */
public enum ListStatus {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED;

    /** A list without books has not started: there is nothing in it to read. */
    static ListStatus of(int bookCount, int readCount) {
        if (readCount == 0) {
            return NOT_STARTED;
        }
        return readCount >= bookCount ? COMPLETED : IN_PROGRESS;
    }
}
