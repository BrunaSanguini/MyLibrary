package io.github.brunasanguini.minhalivraria.reading.application;

import io.github.brunasanguini.minhalivraria.books.BookCatalog;
import io.github.brunasanguini.minhalivraria.books.BookSummary;
import io.github.brunasanguini.minhalivraria.reading.ReadingHistory;
import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The reading statistics of the profile. Nothing is stored: every number comes from the readings, sessions and
 * reviews at the moment it is asked (docs/modelo-de-dados.md).
 */
@Service
@Transactional(readOnly = true)
public class StatsService {

    /** A year of daily data, leap day included, is the most the heat map needs. */
    static final int LONGEST_PERIOD = 366;

    private static final int LAST_DAYS = 30;

    private final ReadingStatsQueries queries;
    private final ReadingHistory history;
    private final BookCatalog books;
    private final Clock clock;

    StatsService(ReadingStatsQueries queries, ReadingHistory history, BookCatalog books, Clock clock) {
        this.queries = queries;
        this.history = history;
        this.books = books;
        this.clock = clock;
    }

    /**
     * @param year the year of the numbers; the current one when null
     * @param month 1 to 12; the current one when null
     */
    public StatsOverviewResponse overview(@Nullable Integer year, @Nullable Integer month) {
        LocalDate today = LocalDate.now(clock);
        YearMonth chosen =
                YearMonth.of(year == null ? today.getYear() : year, month == null ? today.getMonthValue() : month);
        LocalDate yearStart = chosen.atDay(1).withDayOfYear(1);
        LocalDate yearEnd = yearStart.plusYears(1).minusDays(1);
        Streaks streaks = Streaks.of(queries.readingDays(), today);
        return new StatsOverviewResponse(
                chosen.getYear(),
                chosen.getMonthValue(),
                history.finishedReadings(chosen.atDay(1), chosen.atEndOfMonth()),
                history.finishedReadings(yearStart, yearEnd),
                queries.averageRating()
                        .map(average -> average.setScale(1, RoundingMode.HALF_UP))
                        .orElse(null),
                history.finishedRereads(yearStart, yearEnd),
                history.pagesRead(yearStart, yearEnd),
                streaks.current(),
                streaks.longest(),
                history.finishedReadings(today.minusDays(LAST_DAYS - 1L), today),
                queries.inProgress(),
                fastest(yearStart, yearEnd));
    }

    /**
     * @throws BadRequestException {@code stats.invalid-period} when the period ends before it starts, and {@code
     *     stats.period-too-long} when it has more than 366 days
     */
    public List<DailyPagesResponse> dailyPages(LocalDate from, LocalDate to) {
        checkPeriod(from, to);
        return queries.pagesPerDay(from, to);
    }

    /** A month of the calendar: the books of each day with a session, and the readings finished in it. */
    public CalendarResponse calendar(@Nullable Integer year, @Nullable Integer month) {
        LocalDate today = LocalDate.now(clock);
        YearMonth chosen =
                YearMonth.of(year == null ? today.getYear() : year, month == null ? today.getMonthValue() : month);
        LocalDate from = chosen.atDay(1);
        LocalDate to = chosen.atEndOfMonth();
        List<ReadingStatsQueries.DayBook> rows = queries.pagesPerDayAndBook(from, to);
        Map<Long, BookSummary> summaries = books.findAll(rows.stream()
                .map(ReadingStatsQueries.DayBook::bookId)
                .distinct()
                .toList());
        Map<LocalDate, List<CalendarResponse.CalendarEntryResponse>> byDay = new LinkedHashMap<>();
        for (ReadingStatsQueries.DayBook row : rows) {
            BookSummary book = summaries.get(row.bookId());
            if (book != null) {
                byDay.computeIfAbsent(row.day(), day -> new ArrayList<>())
                        .add(new CalendarResponse.CalendarEntryResponse(
                                book.id(),
                                book.title(),
                                book.authors(),
                                book.coverUrl(),
                                row.pages(),
                                row.started(),
                                row.finished()));
            }
        }
        List<CalendarResponse.CalendarDayResponse> days = byDay.entrySet().stream()
                .map(entry -> new CalendarResponse.CalendarDayResponse(entry.getKey(), List.copyOf(entry.getValue())))
                .toList();
        return new CalendarResponse(chosen.getYear(), chosen.getMonthValue(), queries.finishedBetween(from, to), days);
    }

    /** The books of the period, the ones with more days first. */
    public List<BookTimeResponse> booksTime(LocalDate from, LocalDate to) {
        checkPeriod(from, to);
        List<ReadingStatsQueries.BookTime> times = queries.timePerBook(from, to);
        Map<Long, BookSummary> summaries = books.findAll(
                times.stream().map(ReadingStatsQueries.BookTime::bookId).toList());
        List<BookTimeResponse> result = new ArrayList<>();
        for (ReadingStatsQueries.BookTime time : times) {
            BookSummary book = summaries.get(time.bookId());
            if (book != null) {
                result.add(new BookTimeResponse(book.id(), book.title(), book.coverUrl(), time.days(), time.pages()));
            }
        }
        return result;
    }

    private @Nullable FastestReadingResponse fastest(LocalDate from, LocalDate to) {
        return queries.fastestFinished(from, to)
                .map(fastest -> new FastestReadingResponse(
                        fastest.bookId(), books.require(fastest.bookId()).title(), fastest.days()))
                .orElse(null);
    }

    private static void checkPeriod(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            throw new BadRequestException("stats.invalid-period");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > LONGEST_PERIOD) {
            throw new BadRequestException("stats.period-too-long", LONGEST_PERIOD);
        }
    }

    /**
     * Runs of consecutive days with reading.
     *
     * @param current the run that ends today, or yesterday, since today may still get its session
     */
    record Streaks(int current, int longest) {

        static Streaks of(List<LocalDate> days, LocalDate today) {
            int longest = 0;
            int run = 0;
            @Nullable LocalDate previous = null;
            for (LocalDate day : days) {
                run = previous != null && previous.plusDays(1).equals(day) ? run + 1 : 1;
                longest = Math.max(longest, run);
                previous = day;
            }
            boolean alive = previous != null && !previous.isBefore(today.minusDays(1));
            return new Streaks(alive ? run : 0, longest);
        }
    }
}
