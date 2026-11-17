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
}
