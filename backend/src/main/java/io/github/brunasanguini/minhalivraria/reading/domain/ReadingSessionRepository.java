package io.github.brunasanguini.minhalivraria.reading.domain;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReadingSessionRepository extends JpaRepository<ReadingSession, Long> {

    List<ReadingSession> findByReadingIdOrderByDateAscIdAsc(long readingId);

    /** A session is always addressed through its reading, so the pair has to match. */
    Optional<ReadingSession> findByIdAndReadingId(long id, long readingId);

    /** Pages of every session of a period, both ends included, whatever the reading. */
    @Query("select coalesce(sum(s.pagesRead), 0) from ReadingSession s where s.date between :from and :to")
    long sumPagesBetween(LocalDate from, LocalDate to);

    /** Pages of the sessions of a period, both ends included, of the readings of these books. */
    @Query("""
            select coalesce(sum(s.pagesRead), 0) from ReadingSession s
            where s.date between :from and :to and s.reading.bookId in :bookIds
            """)
    long sumPagesBetweenForBooks(LocalDate from, LocalDate to, Collection<Long> bookIds);
}
