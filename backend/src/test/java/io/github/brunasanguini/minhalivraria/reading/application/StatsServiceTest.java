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
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.transaction.annotation.Transactional;

/** Today is 2 January 2026, so every test crosses the turn of the year. */
@SpringBootTest
@Transactional
class StatsServiceTest {

    private static final Path DATA_DIR = tempDataDir();
    private static final LocalDate TODAY = LocalDate.parse("2026-01-02");

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-01-02T15:00:00Z"), ZoneOffset.UTC);
    }

    @Autowired
    private StatsService stats;

    @Autowired
    private BookService books;

    @Autowired
    private AuthorService authors;

    @Autowired
    private ReadingService readings;

    @Autowired
    private ReviewService reviews;

    @Autowired
    private EntityManager entityManager;

    private long hobbit;
    private long dune;
    private long tales;

    @BeforeEach
    void books() {
        long tolkien = authors.create(new AuthorRequest("J. R. R. Tolkien")).id();
        hobbit = book("O Hobbit", 300, tolkien);
        dune = book("Duna", 600, tolkien);
        tales = book("Contos Inacabados", 400, tolkien);
    }

    @Test
    void shouldCountTheStreakAcrossTheTurnOfTheYear() {
        sessionsOn(hobbit, "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02");

        StatsOverviewResponse overview = stats.overview(null, null);

        assertThat(overview.currentStreak()).isEqualTo(4);
        assertThat(overview.longestStreak()).isEqualTo(4);
    }

    @Test
    void shouldKeepTheStreakThatReachedYesterdayAndDropAnOlderOne() {
        sessionsOn(hobbit, "2025-12-31", "2026-01-01");
        assertThat(stats.overview(null, null).currentStreak()).isEqualTo(2);
    }

    @Test
    void shouldEndTheStreakWhenADayWasMissed() {
        sessionsOn(hobbit, "2025-12-20", "2025-12-21", "2025-12-22", "2025-12-31");

        StatsOverviewResponse overview = stats.overview(null, null);

        assertThat(overview.currentStreak()).isZero();
        assertThat(overview.longestStreak()).isEqualTo(3);
    }

    @Test
    void shouldCountADayWithTwoSessionsOnce() {
        sessionsOn(hobbit, "2026-01-01");
        sessionsOn(dune, "2026-01-01", "2026-01-02");

        assertThat(stats.overview(null, null).currentStreak()).isEqualTo(2);
    }

    @Test
    void shouldStartAtZeroWithoutReadings() {
        StatsOverviewResponse overview = stats.overview(null, null);

        assertThat(overview.year()).isEqualTo(2026);
        assertThat(overview.month()).isEqualTo(1);
        assertThat(overview.finishedInYear()).isZero();
        assertThat(overview.averageRating()).isNull();
        assertThat(overview.currentStreak()).isZero();
        assertThat(overview.longestStreak()).isZero();
        assertThat(overview.fastestInYear()).isNull();
    }

    @Test
    void shouldSeparateTheTotalsOfEachYear() {
        finished(hobbit, "2025-12-01", "2025-12-31", false);
        finished(dune, "2025-12-15", "2026-01-01", false);
        finished(hobbit, "2026-01-01", "2026-01-02", true);

        StatsOverviewResponse january = stats.overview(null, null);
        StatsOverviewResponse december = stats.overview(2025, 12);

        assertThat(january.finishedInMonth()).isEqualTo(2);
        assertThat(january.finishedInYear()).isEqualTo(2);
        assertThat(january.rereadsInYear()).isEqualTo(1);
        assertThat(january.pagesInYear()).isEqualTo(900);
        assertThat(december.finishedInMonth()).isEqualTo(1);
        assertThat(december.finishedInYear()).isEqualTo(1);
        assertThat(december.rereadsInYear()).isZero();
        assertThat(january.finishedLast30Days()).isEqualTo(3);
    }

    @Test
    void shouldFindTheFastestReadingOfTheYear() {
        finished(dune, "2025-12-15", "2026-01-02", false);
        finished(hobbit, "2026-01-01", "2026-01-02", false);
        finished(tales, "2025-12-20", "2025-12-20", false);

        assertThat(stats.overview(null, null).fastestInYear())
                .isEqualTo(new FastestReadingResponse(hobbit, "O Hobbit", 2));
        assertThat(stats.overview(2025, 12).fastestInYear())
                .isEqualTo(new FastestReadingResponse(tales, "Contos Inacabados", 1));
    }

    @Test
    void shouldAverageTheRatingsWithOneDecimal() {
        reviews.save(hobbit, new ReviewRequest(new BigDecimal("5"), null));
        reviews.save(dune, new ReviewRequest(new BigDecimal("4.5"), null));
        reviews.save(tales, new ReviewRequest(new BigDecimal("4"), null));
        entityManager.flush();

        assertThat(stats.overview(null, null).averageRating()).isEqualByComparingTo("4.5");
    }

    @Test
    void shouldCountTheReadingsInProgress() {
        readings.create(hobbit, new ReadingRequest(ReadingStatus.IN_PROGRESS, TODAY, null, null));
        readings.create(dune, new ReadingRequest(ReadingStatus.IN_PROGRESS, TODAY, null, null));
        entityManager.flush();

        assertThat(stats.overview(null, null).inProgress()).isEqualTo(2);
    }

    @Test
    void shouldSumThePagesOfEachDayAcrossTheTurnOfTheYear() {
        long hobbitReading = inProgress(hobbit, "2025-12-01");
        long duneReading = inProgress(dune, "2025-12-01");
        session(hobbitReading, "2025-12-31", 20);
        session(duneReading, "2025-12-31", 30);
        session(duneReading, "2026-01-02", 15);
        session(duneReading, "2025-12-01", 5);
        entityManager.flush();

        assertThat(stats.dailyPages(LocalDate.parse("2025-12-31"), TODAY))
                .containsExactly(
                        new DailyPagesResponse(LocalDate.parse("2025-12-31"), 50),
                        new DailyPagesResponse(LocalDate.parse("2026-01-02"), 15));
    }

    @Test
    void shouldAcceptAYearAndADayButNothingLonger() {
        assertThat(stats.dailyPages(LocalDate.parse("2025-01-02"), TODAY)).isEmpty();

        assertThatThrownBy(() -> stats.dailyPages(LocalDate.parse("2025-01-01"), TODAY))
                .isInstanceOf(BadRequestException.class)
                .extracting("code")
                .isEqualTo("stats.period-too-long");
        assertThatThrownBy(() -> stats.booksTime(LocalDate.parse("2024-01-01"), TODAY))
                .isInstanceOf(BadRequestException.class)
                .extracting("code")
                .isEqualTo("stats.period-too-long");
    }

    @Test
    void shouldRefuseAPeriodThatEndsBeforeItStarts() {
        assertThatThrownBy(() -> stats.dailyPages(TODAY, TODAY.minusDays(1)))
                .isInstanceOf(BadRequestException.class)
                .extracting("code")
                .isEqualTo("stats.invalid-period");
    }

    @Test
    void shouldPutFirstTheBooksThatTookMoreDays() {
        long hobbitReading = inProgress(hobbit, "2025-12-01");
        long duneReading = inProgress(dune, "2025-12-01");
        session(hobbitReading, "2025-12-30", 100);
        session(duneReading, "2025-12-30", 10);
        session(duneReading, "2025-12-31", 10);
        session(duneReading, "2025-12-31", 5);
        session(hobbitReading, "2025-12-01", 50);
        entityManager.flush();

        List<BookTimeResponse> time = stats.booksTime(LocalDate.parse("2025-12-30"), TODAY);

        assertThat(time)
                .containsExactly(
                        new BookTimeResponse(dune, "Duna", null, 2, 25),
                        new BookTimeResponse(hobbit, "O Hobbit", null, 1, 100));
    }

    @Test
    void shouldListTheBooksOfEachDayOfTheMonthWithTheirStartAndEnd() {
        long hobbitReading = inProgress(hobbit, "2025-12-30");
        long duneReading = inProgress(dune, "2025-12-01");
        session(hobbitReading, "2025-12-30", 100);
        session(duneReading, "2025-12-30", 10);
        session(hobbitReading, "2025-12-31", 15);
        session(hobbitReading, "2025-12-31", 5);
        readings.finish(hobbitReading, LocalDate.parse("2025-12-31"));
        session(duneReading, "2026-01-01", 30);
        entityManager.flush();

        CalendarResponse december = stats.calendar(2025, 12);

        assertThat(december.year()).isEqualTo(2025);
        assertThat(december.month()).isEqualTo(12);
        assertThat(december.finished()).isEqualTo(1);
        assertThat(december.days())
                .extracting(CalendarResponse.CalendarDayResponse::date)
                .containsExactly(
                        LocalDate.parse("2025-12-01"), LocalDate.parse("2025-12-30"), LocalDate.parse("2025-12-31"));
        assertThat(december.days().getFirst().books())
                .containsExactly(new CalendarResponse.CalendarEntryResponse(
                        dune, "Duna", List.of("J. R. R. Tolkien"), null, 0, true, false));
        assertThat(december.days().get(1).books())
                .containsExactly(
                        new CalendarResponse.CalendarEntryResponse(
                                hobbit, "O Hobbit", List.of("J. R. R. Tolkien"), null, 100, true, false),
                        new CalendarResponse.CalendarEntryResponse(
                                dune, "Duna", List.of("J. R. R. Tolkien"), null, 10, false, false));
        assertThat(december.days().getLast().books())
                .containsExactly(new CalendarResponse.CalendarEntryResponse(
                        hobbit, "O Hobbit", List.of("J. R. R. Tolkien"), null, 20, false, true));
    }

    @Test
    void shouldShowStartsAndEndsWithoutSessionsInTheCalendar() {
        inProgress(hobbit, "2025-12-10");
        finished(dune, "2025-11-20", "2025-12-12", false);

        CalendarResponse december = stats.calendar(2025, 12);

        assertThat(december.finished()).isEqualTo(1);
        assertThat(december.days())
                .containsExactly(
                        new CalendarResponse.CalendarDayResponse(
                                LocalDate.parse("2025-12-10"),
                                List.of(new CalendarResponse.CalendarEntryResponse(
                                        hobbit, "O Hobbit", List.of("J. R. R. Tolkien"), null, 0, true, false))),
                        new CalendarResponse.CalendarDayResponse(
                                LocalDate.parse("2025-12-12"),
                                List.of(new CalendarResponse.CalendarEntryResponse(
                                        dune, "Duna", List.of("J. R. R. Tolkien"), null, 0, false, true))));
    }

    @Test
    void shouldOpenTheCalendarOnTheCurrentMonth() {
        CalendarResponse calendar = stats.calendar(null, null);

        assertThat(calendar.year()).isEqualTo(2026);
        assertThat(calendar.month()).isEqualTo(1);
        assertThat(calendar.days()).isEmpty();
    }

    private void sessionsOn(long bookId, String... dates) {
        long reading = inProgress(bookId, "2025-01-01");
        for (String date : dates) {
            session(reading, date, 10);
        }
        entityManager.flush();
    }

    private long inProgress(long bookId, String startDate) {
        return readings.create(
                        bookId, new ReadingRequest(ReadingStatus.IN_PROGRESS, LocalDate.parse(startDate), null, null))
                .id();
    }

    private void session(long readingId, String date, int pages) {
        readings.addSession(readingId, new SessionRequest(LocalDate.parse(date), pages, null, null));
    }

    private void finished(long bookId, String startDate, String endDate, boolean reread) {
        readings.create(
                bookId,
                new ReadingRequest(
                        ReadingStatus.FINISHED, LocalDate.parse(startDate), LocalDate.parse(endDate), reread));
        entityManager.flush();
    }

    private long book(String title, int pageCount, long author) {
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

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-stats-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
