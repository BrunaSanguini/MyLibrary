package io.github.brunasanguini.minhalivraria.reading.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The statistics read the tables with SQL and never load an entity (docs/arquitetura-back-end.md). */
@Repository
class ReadingStatsQueries {

    private final JdbcClient jdbc;

    ReadingStatsQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    List<DailyPagesResponse> pagesPerDay(LocalDate from, LocalDate to) {
        return jdbc.sql("""
                        SELECT session_date, SUM(pages_read) AS pages
                        FROM reading_session
                        WHERE session_date BETWEEN :from AND :to
                        GROUP BY session_date
                        ORDER BY session_date
                        """)
                .param("from", from)
                .param("to", to)
                .query((row, number) ->
                        new DailyPagesResponse(row.getObject("session_date", LocalDate.class), row.getInt("pages")))
                .list();
    }

    /**
     * The pages of each book on each day of the period, the day's biggest reading first. A reading started or
     * finished in the period counts on that day even without a session (0 pages).
     */
    List<DayBook> pagesPerDayAndBook(LocalDate from, LocalDate to) {
        return jdbc.sql("""
                        SELECT d.session_day AS session_day,
                               d.book_id AS book_id,
                               SUM(d.pages) AS pages,
                               MAX(d.started) AS started,
                               MAX(d.finished) AS finished
                        FROM (
                            SELECT s.session_date AS session_day,
                                   r.book_id AS book_id,
                                   s.pages_read AS pages,
                                   CASE WHEN r.start_date = s.session_date THEN 1 ELSE 0 END AS started,
                                   CASE WHEN r.status = 'FINISHED' AND r.end_date = s.session_date
                                       THEN 1 ELSE 0 END AS finished
                            FROM reading_session s
                            JOIN reading r ON r.id = s.reading_id
                            WHERE s.session_date BETWEEN :from AND :to
                            UNION ALL
                            SELECT r.start_date, r.book_id, 0, 1, 0
                            FROM reading r
                            WHERE r.start_date BETWEEN :from AND :to
                            UNION ALL
                            SELECT r.end_date, r.book_id, 0, 0, 1
                            FROM reading r
                            WHERE r.status = 'FINISHED' AND r.end_date BETWEEN :from AND :to
                        ) d
                        GROUP BY d.session_day, d.book_id
                        ORDER BY d.session_day, SUM(d.pages) DESC, d.book_id
                        """)
                .param("from", from)
                .param("to", to)
                .query((row, number) -> new DayBook(
                        row.getObject("session_day", LocalDate.class),
                        row.getLong("book_id"),
                        row.getInt("pages"),
                        row.getInt("started") == 1,
                        row.getInt("finished") == 1))
                .list();
    }

    int finishedBetween(LocalDate from, LocalDate to) {
        Integer count = jdbc.sql("""
                        SELECT COUNT(*) FROM reading
                        WHERE status = 'FINISHED' AND end_date BETWEEN :from AND :to
                        """)
                .param("from", from)
                .param("to", to)
                .query(Integer.class)
                .single();
        return count == null ? 0 : count;
    }

    /** Every day with a session, oldest first: what the streaks are made of. */
    List<LocalDate> readingDays() {
        return jdbc.sql("SELECT DISTINCT session_date FROM reading_session ORDER BY session_date")
                .query(LocalDate.class)
                .list();
    }

    List<BookTime> timePerBook(LocalDate from, LocalDate to) {
        return jdbc.sql("""
                        SELECT r.book_id AS book_id,
                               COUNT(DISTINCT s.session_date) AS days,
                               SUM(s.pages_read) AS pages
                        FROM reading_session s
                        JOIN reading r ON r.id = s.reading_id
                        WHERE s.session_date BETWEEN :from AND :to
                        GROUP BY r.book_id
                        ORDER BY days DESC, pages DESC, r.book_id
                        """)
                .param("from", from)
                .param("to", to)
                .query(BookTime.class)
                .list();
    }

    Optional<BigDecimal> averageRating() {
        // AVG of no rows is one row holding null.
        return jdbc
                .sql("SELECT AVG(rating) FROM review WHERE rating IS NOT NULL")
                .query(BigDecimal.class)
                .list()
                .stream()
                .filter(Objects::nonNull)
                .findFirst();
    }

    int inProgress() {
        return jdbc.sql("SELECT COUNT(*) FROM reading WHERE status = 'IN_PROGRESS'")
                .query(Integer.class)
                .single();
    }

    /** Ties go to the reading that ended last. */
    Optional<Fastest> fastestFinished(LocalDate from, LocalDate to) {
        return jdbc.sql("""
                        SELECT book_id, DATEDIFF(DAY, start_date, end_date) + 1 AS days
                        FROM reading
                        WHERE status = 'FINISHED' AND start_date IS NOT NULL
                            AND end_date BETWEEN :from AND :to
                        ORDER BY days, end_date DESC, id DESC
                        FETCH FIRST 1 ROW ONLY
                        """)
                .param("from", from)
                .param("to", to)
                .query(Fastest.class)
                .optional();
    }

    record BookTime(long bookId, int days, int pages) {}

    record Fastest(long bookId, int days) {}

    record DayBook(LocalDate day, long bookId, int pages, boolean started, boolean finished) {}
}
