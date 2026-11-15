package io.github.brunasanguini.minhalivraria.reading.domain;

import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReadingRepository extends JpaRepository<Reading, Long> {

    /** A book has at most one reading in progress (reading.in-progress-exists). */
    boolean existsByBookIdAndStatus(long bookId, ReadingStatus status);

    /** The reading in progress first, then the others from the latest end to the oldest. */
    @Query("""
            select r from Reading r
            where r.bookId = :bookId
            order by case when r.status = io.github.brunasanguini.minhalivraria.reading.ReadingStatus.IN_PROGRESS
                then 0 else 1 end, r.endDate desc, r.id desc
            """)
    List<Reading> findByBookIdLatestFirst(long bookId);
}
