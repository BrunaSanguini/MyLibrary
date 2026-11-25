package io.github.brunasanguini.minhalivraria.reading.application;

import io.github.brunasanguini.minhalivraria.books.BookCatalog;
import io.github.brunasanguini.minhalivraria.books.BookSummary;
import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.reading.domain.Reading;
import io.github.brunasanguini.minhalivraria.reading.domain.ReadingRepository;
import io.github.brunasanguini.minhalivraria.reading.domain.ReadingSession;
import io.github.brunasanguini.minhalivraria.reading.domain.ReadingSessionRepository;
import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Readings of a book and the sessions of each reading, with the rules of docs/modelo-de-dados.md. */
@Service
@Transactional(readOnly = true)
public class ReadingService {

    private final ReadingRepository readings;
    private final ReadingSessionRepository sessions;
    private final BookCatalog books;

    ReadingService(ReadingRepository readings, ReadingSessionRepository sessions, BookCatalog books) {
        this.readings = readings;
        this.sessions = sessions;
        this.books = books;
    }

    /** The reading in progress first, then from the latest to the oldest. */
    public List<ReadingResponse> listByBook(long bookId) {
        BookSummary book = books.require(bookId);
        return readings.findByBookIdLatestFirst(bookId).stream()
                .map(reading -> toResponse(reading, book))
                .toList();
    }

    /**
     * @throws ConflictException {@code reading.in-progress-exists}, when the book is already being read
     */
    @Transactional
    public ReadingResponse create(long bookId, ReadingRequest request) {
        BookSummary book = books.require(bookId);
        if (request.status() == ReadingStatus.IN_PROGRESS
                && readings.existsByBookIdAndStatus(bookId, ReadingStatus.IN_PROGRESS)) {
            throw new ConflictException("reading.in-progress-exists");
        }
        Reading reading = new Reading(
                bookId, request.status(), request.startDate(), request.endDate(), request.rereadOrDefault());
        return toResponse(readings.save(reading), book);
    }

    @Transactional
    public ReadingResponse reschedule(long id, ReadingPeriodRequest request) {
        Reading reading = find(id);
        reading.reschedule(request.startDate(), request.endDate(), request.rereadOrDefault());
        checkSessionsFit(reading);
        return toResponse(reading);
    }

    @Transactional
    public ReadingResponse finish(long id, LocalDate endDate) {
        Reading reading = find(id);
        reading.finish(endDate);
        checkSessionsFit(reading);
        return toResponse(reading);
    }

    @Transactional
    public ReadingResponse abandon(long id, LocalDate endDate) {
        Reading reading = find(id);
        reading.abandon(endDate);
        checkSessionsFit(reading);
        return toResponse(reading);
    }

    /**
     * @throws ConflictException {@code reading.not-abandoned}, and {@code reading.in-progress-exists} when the book
     *     is already being read in another reading
     */
    @Transactional
    public ReadingResponse resume(long id) {
        Reading reading = find(id);
        if (readings.existsByBookIdAndStatus(reading.bookId(), ReadingStatus.IN_PROGRESS)) {
            throw new ConflictException("reading.in-progress-exists");
        }
        reading.resume();
        return toResponse(reading);
    }

    /** The sessions go with the reading (FK). */
    @Transactional
    public void delete(long id) {
        readings.delete(find(id));
    }

    /**
     * @param from first day, or null for no lower limit
     * @param to last day, or null for no upper limit
     */
    public List<SessionResponse> listSessions(long readingId, @Nullable LocalDate from, @Nullable LocalDate to) {
        find(readingId);
        return sessions.findByReadingIdOrderByDateAscIdAsc(readingId).stream()
                .filter(session -> from == null || !session.date().isBefore(from))
                .filter(session -> to == null || !session.date().isAfter(to))
                .map(ReadingService::toResponse)
                .toList();
    }

    @Transactional
    public SessionResponse addSession(long readingId, SessionRequest request) {
        Reading reading = find(readingId);
        int pagesRead = pagesOf(request, reading, pagesReadIn(readingId, null));
        ReadingSession session = new ReadingSession(reading, request.date(), pagesRead, blankToNull(request.note()));
        return toResponse(sessions.save(session));
    }

    @Transactional
    public SessionResponse updateSession(long readingId, long sessionId, SessionRequest request) {
        ReadingSession session = findSession(readingId, sessionId);
        int pagesRead = pagesOf(request, session.reading(), pagesReadIn(readingId, sessionId));
        session.update(request.date(), pagesRead, blankToNull(request.note()));
        return toResponse(session);
    }

    @Transactional
    public void deleteSession(long readingId, long sessionId) {
        sessions.delete(findSession(readingId, sessionId));
    }

    /**
     * The pages of the day, whichever mode the form used.
     *
     * @param readInOtherSessions pages of the reading without the session being saved
     */
    private int pagesOf(SessionRequest request, Reading reading, int readInOtherSessions) {
        Integer pagesRead = request.pagesRead();
        Integer currentPage = request.currentPage();
        if ((pagesRead == null) == (currentPage == null)) {
            throw new BadRequestException("session.pages-mode");
        }
        Integer pageCount = books.require(reading.bookId()).pageCount();
        if (pageCount == null) {
            throw new BusinessRuleException("session.page-count-required");
        }
        if (!reading.covers(request.date())) {
            throw new BusinessRuleException("session.out-of-period");
        }
        if (currentPage != null) {
            if (currentPage > pageCount) {
                throw new BusinessRuleException("session.exceeds-page-count");
            }
            if (currentPage <= readInOtherSessions) {
                throw new BusinessRuleException("session.page-not-ahead");
            }
            return currentPage - readInOtherSessions;
        }
        int pages = pagesRead == null ? 0 : pagesRead;
        if ((long) readInOtherSessions + pages > pageCount) {
            throw new BusinessRuleException("session.exceeds-page-count");
        }
        return pages;
    }

    /** Changing the period of a reading cannot leave a session outside it. */
    private void checkSessionsFit(Reading reading) {
        boolean outside = sessions.findByReadingIdOrderByDateAscIdAsc(reading.id()).stream()
                .anyMatch(session -> !reading.covers(session.date()));
        if (outside) {
            throw new BusinessRuleException("session.out-of-period");
        }
    }

    private int pagesReadIn(long readingId, @Nullable Long exceptSessionId) {
        return sessions.findByReadingIdOrderByDateAscIdAsc(readingId).stream()
                .filter(session -> exceptSessionId == null || session.id() != exceptSessionId)
                .mapToInt(ReadingSession::pagesRead)
                .sum();
    }

    private Reading find(long id) {
        return readings.findById(id).orElseThrow(() -> new NotFoundException("reading.not-found"));
    }

    private ReadingSession findSession(long readingId, long sessionId) {
        find(readingId);
        return sessions.findByIdAndReadingId(sessionId, readingId)
                .orElseThrow(() -> new NotFoundException("session.not-found"));
    }

    private ReadingResponse toResponse(Reading reading) {
        return toResponse(reading, books.require(reading.bookId()));
    }

    private ReadingResponse toResponse(Reading reading, BookSummary book) {
        List<ReadingSession> ofReading = sessions.findByReadingIdOrderByDateAscIdAsc(reading.id());
        int pagesRead = ofReading.stream().mapToInt(ReadingSession::pagesRead).sum();
        return new ReadingResponse(
                reading.id(),
                reading.bookId(),
                reading.status(),
                reading.startDate(),
                reading.endDate(),
                reading.reread(),
                ProgressResponse.of(pagesRead, book.pageCount(), reading.status() == ReadingStatus.FINISHED),
                ofReading.size(),
                reading.rating());
    }

    private static SessionResponse toResponse(ReadingSession session) {
        return new SessionResponse(session.id(), session.date(), session.pagesRead(), session.note());
    }

    private static @Nullable String blankToNull(@Nullable String text) {
        return text == null || text.isBlank() ? null : text.strip();
    }
}
