package io.github.brunasanguini.minhalivraria.reading.application;

import io.github.brunasanguini.minhalivraria.books.BookCatalog;
import io.github.brunasanguini.minhalivraria.books.BookSummary;
import io.github.brunasanguini.minhalivraria.reading.ReadingHistory;
import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.reading.domain.Reading;
import io.github.brunasanguini.minhalivraria.reading.domain.ReadingRepository;
import io.github.brunasanguini.minhalivraria.reading.domain.ReadingSession;
import io.github.brunasanguini.minhalivraria.reading.domain.ReadingSessionRepository;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
class ReadingHistoryService implements ReadingHistory {

    private final ReadingRepository readings;
    private final ReadingSessionRepository sessions;
    private final BookCatalog books;

    ReadingHistoryService(ReadingRepository readings, ReadingSessionRepository sessions, BookCatalog books) {
        this.readings = readings;
        this.sessions = sessions;
        this.books = books;
    }

    @Override
    public int finishedReadings(LocalDate from, LocalDate to) {
        return Math.toIntExact(readings.countByStatusAndEndDateBetween(ReadingStatus.FINISHED, from, to));
    }

    @Override
    public int finishedRereads(LocalDate from, LocalDate to) {
        return Math.toIntExact(readings.countByStatusAndRereadTrueAndEndDateBetween(ReadingStatus.FINISHED, from, to));
    }

    @Override
    public int pagesRead(LocalDate from, LocalDate to) {
        long inSessions = sessions.sumPagesBetween(from, to);
        List<Reading> finished = readings.findByStatusAndEndDateBetween(ReadingStatus.FINISHED, from, to);
        return Math.toIntExact(inSessions + leftAtTheEnd(finished));
    }

    @Override
    public int finishedReadings(LocalDate from, LocalDate to, Collection<Long> bookIds) {
        if (bookIds.isEmpty()) {
            return 0;
        }
        long count = readings.countByStatusAndEndDateBetweenAndBookIdIn(ReadingStatus.FINISHED, from, to, bookIds);
        return Math.toIntExact(count);
    }

    @Override
    public int finishedRereads(LocalDate from, LocalDate to, Collection<Long> bookIds) {
        if (bookIds.isEmpty()) {
            return 0;
        }
        long count = readings.countByStatusAndRereadTrueAndEndDateBetweenAndBookIdIn(
                ReadingStatus.FINISHED, from, to, bookIds);
        return Math.toIntExact(count);
    }

    @Override
    public int pagesRead(LocalDate from, LocalDate to, Collection<Long> bookIds) {
        if (bookIds.isEmpty()) {
            return 0;
        }
        long inSessions = sessions.sumPagesBetweenForBooks(from, to, bookIds);
        List<Reading> finished =
                readings.findByStatusAndEndDateBetweenAndBookIdIn(ReadingStatus.FINISHED, from, to, bookIds);
        return Math.toIntExact(inSessions + leftAtTheEnd(finished));
    }

    /** The pages each finished reading still had left after all its sessions, counted on the day it ended. */
    private long leftAtTheEnd(List<Reading> finished) {
        Map<Long, BookSummary> ofReadings =
                books.findAll(finished.stream().map(Reading::bookId).distinct().toList());
        long left = 0;
        for (Reading reading : finished) {
            BookSummary book = ofReadings.get(reading.bookId());
            Integer pageCount = book == null ? null : book.pageCount();
            if (pageCount != null) {
                int inAllSessions = sessions.findByReadingIdOrderByDateAscIdAsc(reading.id()).stream()
                        .mapToInt(ReadingSession::pagesRead)
                        .sum();
                left += Math.max(0, pageCount - inAllSessions);
            }
        }
        return left;
    }

    @Override
    public Set<Long> booksRead(Collection<Long> bookIds) {
        return bookIds.isEmpty() ? Set.of() : readings.findFinishedBookIds(bookIds);
    }
}
