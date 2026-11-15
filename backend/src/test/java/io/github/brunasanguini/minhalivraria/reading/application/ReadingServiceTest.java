package io.github.brunasanguini.minhalivraria.reading.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.application.AuthorRequest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorService;
import io.github.brunasanguini.minhalivraria.books.application.BookRequest;
import io.github.brunasanguini.minhalivraria.books.application.BookService;
import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ReadingServiceTest {

    private static final Path DATA_DIR = tempDataDir();
    private static final LocalDate NOV_1 = LocalDate.parse("2026-11-01");
    private static final LocalDate NOV_8 = LocalDate.parse("2026-11-08");
    private static final int PAGES = 576;

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private ReadingService readings;

    @Autowired
    private BookService books;

    @Autowired
    private AuthorService authors;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcClient jdbc;

    private long fellowship;
    private long withoutPages;

    @BeforeEach
    void books() {
        long tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        fellowship = book("A Sociedade do Anel", PAGES, tolkien);
        withoutPages = book("O Hobbit", null, tolkien);
    }

    @Test
    void shouldStartAReading() {
        ReadingResponse reading = readings.create(fellowship, inProgressFrom(NOV_1));

        assertThat(reading.bookId()).isEqualTo(fellowship);
        assertThat(reading.status()).isEqualTo(ReadingStatus.IN_PROGRESS);
        assertThat(reading.startDate()).isEqualTo(NOV_1);
        assertThat(reading.endDate()).isNull();
        assertThat(reading.reread()).isFalse();
        assertThat(reading.progress()).isEqualTo(new ProgressResponse(0, PAGES, 0));
        assertThat(reading.sessionCount()).isZero();
    }

    @Test
    void shouldRefuseASecondReadingInProgressOfTheSameBook() {
        readings.create(fellowship, inProgressFrom(NOV_1));

        assertCode(
                () -> readings.create(fellowship, inProgressFrom(NOV_8)),
                ConflictException.class,
                "reading.in-progress-exists");
    }

    @Test
    void shouldAllowReadingTwoBooksAtTheSameTime() {
        readings.create(fellowship, inProgressFrom(NOV_1));

        assertThat(readings.create(withoutPages, inProgressFrom(NOV_1)).status())
                .isEqualTo(ReadingStatus.IN_PROGRESS);
    }

    @Test
    void shouldAllowAnotherReadingAfterTheFirstIsFinished() {
        long first = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.finish(first, NOV_8);
        entityManager.flush();

        ReadingResponse second =
                readings.create(fellowship, new ReadingRequest(ReadingStatus.IN_PROGRESS, NOV_8, null, true));

        assertThat(second.reread()).isTrue();
    }

    @Test
    void shouldRegisterOldReadingsNextToTheOneInProgress() {
        readings.create(fellowship, inProgressFrom(NOV_1));

        ReadingResponse old = readings.create(
                fellowship, new ReadingRequest(ReadingStatus.FINISHED, null, LocalDate.parse("2019-07-01"), null));

        assertThat(old.status()).isEqualTo(ReadingStatus.FINISHED);
        assertThat(old.progress().percent()).isEqualTo(100);
    }

    @Test
    void shouldLetTheDatabaseRefuseTwoReadingsInProgressToo() {
        readings.create(fellowship, inProgressFrom(NOV_1));
        entityManager.flush();

        // Straight to the table, around the service: the generated column with UNIQUE is the last line of defense.
        assertThatThrownBy(() -> jdbc.sql("""
                        insert into reading (book_id, status, start_date, reread, created_at, updated_at)
                        values (:book, 'IN_PROGRESS', date '2026-11-08', false, now(), now())
                        """).param("book", fellowship).update())
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldRefuseAReadingOfAnUnknownBook() {
        assertCode(() -> readings.create(404, inProgressFrom(NOV_1)), NotFoundException.class, "book.not-found");
        assertCode(() -> readings.listByBook(404), NotFoundException.class, "book.not-found");
    }

    @Test
    void shouldListTheReadingInProgressFirstAndThenFromTheLatestToTheOldest() {
        long oldest = past(ReadingStatus.FINISHED, "2019-07-01");
        long abandoned = past(ReadingStatus.ABANDONED, "2023-02-10");
        long current = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        long sameDay = past(ReadingStatus.FINISHED, "2023-02-10");
        entityManager.flush();

        assertThat(readings.listByBook(fellowship))
                .extracting(ReadingResponse::id)
                .containsExactly(current, sameDay, abandoned, oldest);
    }

    @Test
    void shouldFinishAndAbandon() {
        long first = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        long second = readings.create(withoutPages, inProgressFrom(NOV_1)).id();

        assertThat(readings.finish(first, NOV_8))
                .extracting(ReadingResponse::status, ReadingResponse::endDate)
                .containsExactly(ReadingStatus.FINISHED, NOV_8);
        assertThat(readings.abandon(second, NOV_8).status()).isEqualTo(ReadingStatus.ABANDONED);
    }

    @Test
    void shouldOnlyFinishAReadingInProgress() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.finish(reading, NOV_8);

        assertCode(() -> readings.finish(reading, NOV_8), ConflictException.class, "reading.not-in-progress");
        assertCode(() -> readings.abandon(reading, NOV_8), ConflictException.class, "reading.not-in-progress");
    }

    @Test
    void shouldRefuseToFinishBeforeTheLastSession() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_8, 25));
        entityManager.flush();

        assertCode(
                () -> readings.finish(reading, NOV_8.minusDays(1)),
                BusinessRuleException.class,
                "session.out-of-period");
    }

    @Test
    void shouldCorrectThePeriodKeepingTheSessionsInside() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_1.plusDays(1), 25));
        entityManager.flush();

        ReadingResponse corrected =
                readings.reschedule(reading, new ReadingPeriodRequest(NOV_1.minusDays(2), null, true));

        assertThat(corrected.startDate()).isEqualTo(NOV_1.minusDays(2));
        assertThat(corrected.reread()).isTrue();
        assertCode(
                () -> readings.reschedule(reading, new ReadingPeriodRequest(NOV_8, null, false)),
                BusinessRuleException.class,
                "session.out-of-period");
    }

    @Test
    void shouldAddUpTheSessionsIntoTheProgress() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_1, 100));
        readings.addSession(reading, pages(NOV_8, 20));
        entityManager.flush();

        ReadingResponse found = readings.listByBook(fellowship).getFirst();

        assertThat(found.progress()).isEqualTo(new ProgressResponse(120, PAGES, 20));
        assertThat(found.sessionCount()).isEqualTo(2);
    }

    @Test
    void shouldCountAFinishedReadingAsComplete() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_1, 100));
        entityManager.flush();

        assertThat(readings.finish(reading, NOV_8).progress()).isEqualTo(new ProgressResponse(100, PAGES, 100));
    }

    @Test
    void shouldConvertTheCurrentPageIntoPagesRead() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_1, 100));
        entityManager.flush();

        SessionResponse session = readings.addSession(reading, currentPage(NOV_8, 145));

        assertThat(session.pagesRead()).isEqualTo(45);
        assertThat(session.date()).isEqualTo(NOV_8);
    }

    @Test
    void shouldRefuseACurrentPageThatIsNotAhead() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_1, 100));
        entityManager.flush();

        assertCode(
                () -> readings.addSession(reading, currentPage(NOV_8, 100)),
                BusinessRuleException.class,
                "session.page-not-ahead");
        assertCode(
                () -> readings.addSession(reading, currentPage(NOV_8, 60)),
                BusinessRuleException.class,
                "session.page-not-ahead");
    }

    @Test
    void shouldRefuseASessionThatPassesTheTotalOfTheBook() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_1, 500));
        entityManager.flush();

        assertCode(
                () -> readings.addSession(reading, pages(NOV_8, 77)),
                BusinessRuleException.class,
                "session.exceeds-page-count");
        assertCode(
                () -> readings.addSession(reading, currentPage(NOV_8, PAGES + 1)),
                BusinessRuleException.class,
                "session.exceeds-page-count");
        assertThat(readings.addSession(reading, pages(NOV_8, 76)).pagesRead()).isEqualTo(76);
    }

    @Test
    void shouldRefuseASessionOutsideThePeriodOfTheReading() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();

        assertCode(
                () -> readings.addSession(reading, pages(NOV_1.minusDays(1), 10)),
                BusinessRuleException.class,
                "session.out-of-period");

        readings.finish(reading, NOV_8);
        assertCode(
                () -> readings.addSession(reading, pages(NOV_8.plusDays(1), 10)),
                BusinessRuleException.class,
                "session.out-of-period");
        assertThat(readings.addSession(reading, pages(NOV_8, 10)).pagesRead()).isEqualTo(10);
    }

    @Test
    void shouldRefuseASessionOfABookWithoutPageCount() {
        long reading = readings.create(withoutPages, inProgressFrom(NOV_1)).id();

        assertCode(
                () -> readings.addSession(reading, pages(NOV_8, 10)),
                BusinessRuleException.class,
                "session.page-count-required");
        assertCode(
                () -> readings.addSession(reading, currentPage(NOV_8, 10)),
                BusinessRuleException.class,
                "session.page-count-required");
    }

    @Test
    void shouldRequireExactlyOneOfPagesReadAndCurrentPage() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();

        assertCode(
                () -> readings.addSession(reading, new SessionRequest(NOV_8, null, null, null)),
                BadRequestException.class,
                "session.pages-mode");
        assertCode(
                () -> readings.addSession(reading, new SessionRequest(NOV_8, 10, 10, null)),
                BadRequestException.class,
                "session.pages-mode");
    }

    @Test
    void shouldUpdateASessionWithoutCountingItsOwnPagesTwice() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_1, 100));
        long session = readings.addSession(reading, pages(NOV_8, 400)).id();
        entityManager.flush();

        // 100 of the other session plus 476 is exactly the book; the 400 it had do not count.
        SessionResponse updated =
                readings.updateSession(reading, session, new SessionRequest(NOV_8, 476, null, "  Fim.  "));

        assertThat(updated.pagesRead()).isEqualTo(476);
        assertThat(updated.note()).isEqualTo("Fim.");
        assertCode(
                () -> readings.updateSession(reading, session, pages(NOV_8, 477)),
                BusinessRuleException.class,
                "session.exceeds-page-count");
    }

    @Test
    void shouldReadTheCurrentPageOfAnUpdateAgainstTheOtherSessions() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_1, 100));
        long session = readings.addSession(reading, pages(NOV_8, 30)).id();
        entityManager.flush();

        assertThat(readings.updateSession(reading, session, currentPage(NOV_8, 150))
                        .pagesRead())
                .isEqualTo(50);
    }

    @Test
    void shouldListTheSessionsByDateAndFilterByPeriod() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_8, 30));
        readings.addSession(reading, pages(NOV_1, 10));
        readings.addSession(reading, pages(NOV_1.plusDays(3), 20));
        entityManager.flush();

        assertThat(readings.listSessions(reading, null, null))
                .extracting(SessionResponse::pagesRead)
                .containsExactly(10, 20, 30);
        assertThat(readings.listSessions(reading, NOV_1.plusDays(1), NOV_8.minusDays(1)))
                .extracting(SessionResponse::pagesRead)
                .containsExactly(20);
    }

    @Test
    void shouldDeleteASessionAndGiveItsPagesBack() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        long session = readings.addSession(reading, pages(NOV_1, 100)).id();
        entityManager.flush();

        readings.deleteSession(reading, session);
        entityManager.flush();

        assertThat(readings.listSessions(reading, null, null)).isEmpty();
        assertThat(readings.listByBook(fellowship).getFirst().progress().pagesRead())
                .isZero();
    }

    @Test
    void shouldAddressASessionOnlyThroughItsOwnReading() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        long other = readings.create(withoutPages, inProgressFrom(NOV_1)).id();
        long session = readings.addSession(reading, pages(NOV_1, 100)).id();
        entityManager.flush();

        assertCode(() -> readings.deleteSession(other, session), NotFoundException.class, "session.not-found");
        assertCode(() -> readings.deleteSession(404, session), NotFoundException.class, "reading.not-found");
    }

    @Test
    void shouldDeleteAReadingWithItsSessions() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_1, 100));
        entityManager.flush();
        entityManager.clear();

        readings.delete(reading);
        entityManager.flush();

        assertThat(readings.listByBook(fellowship)).isEmpty();
        assertThat(jdbc.sql("select count(*) from reading_session")
                        .query(Long.class)
                        .single())
                .isZero();
    }

    @Test
    void shouldLoseTheReadingsWhenTheBookIsDeleted() {
        long reading = readings.create(fellowship, inProgressFrom(NOV_1)).id();
        readings.addSession(reading, pages(NOV_1, 100));
        entityManager.flush();
        entityManager.clear();

        books.delete(fellowship);
        entityManager.flush();
        entityManager.clear();

        assertCode(() -> readings.listSessions(reading, null, null), NotFoundException.class, "reading.not-found");
    }

    private long past(ReadingStatus status, String endDate) {
        return readings.create(fellowship, new ReadingRequest(status, null, LocalDate.parse(endDate), null))
                .id();
    }

    private long book(String title, Integer pageCount, long author) {
        return books.create(new BookRequest(
                        title,
                        null,
                        null,
                        null,
                        pageCount,
                        null,
                        null,
                        null,
                        List.of(author),
                        null,
                        null,
                        null,
                        null,
                        Ownership.OWNED,
                        false))
                .id();
    }

    private static ReadingRequest inProgressFrom(LocalDate start) {
        return new ReadingRequest(ReadingStatus.IN_PROGRESS, start, null, null);
    }

    private static SessionRequest pages(LocalDate date, int pagesRead) {
        return new SessionRequest(date, pagesRead, null, null);
    }

    private static SessionRequest currentPage(LocalDate date, int page) {
        return new SessionRequest(date, null, page, null);
    }

    private static void assertCode(ThrowingCallable action, Class<? extends Throwable> type, String code) {
        assertThatThrownBy(action).isInstanceOf(type).extracting("code").isEqualTo(code);
    }

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-reading-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
