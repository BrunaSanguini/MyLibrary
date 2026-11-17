package io.github.brunasanguini.minhalivraria.reading;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Set;

/**
 * Public API of the module: what was read in a period, for the goals, and which books were read, for the lists.
 * Both ends of every period are included.
 */
public interface ReadingHistory {

    /** Readings finished in the period, rereads included: a book read twice counts twice. */
    int finishedReadings(LocalDate from, LocalDate to);

    /** Readings marked as reread that were finished in the period. */
    int finishedRereads(LocalDate from, LocalDate to);

    /**
     * Pages of the sessions of the period, plus the pages each reading finished in the period still had left (the
     * pages of the book minus all its sessions), counted on the day it ended. A reading without sessions adds the
     * whole book, so the pages always match a progress of 100%.
     */
    int pagesRead(LocalDate from, LocalDate to);

    /** Which of the books have at least one finished reading. */
    Set<Long> booksRead(Collection<Long> bookIds);
}
