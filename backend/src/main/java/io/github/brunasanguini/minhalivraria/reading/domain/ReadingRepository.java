package io.github.brunasanguini.minhalivraria.reading.domain;

import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Set;
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

    /** Goals count the readings finished in a period, both ends included. */
    long countByStatusAndEndDateBetween(ReadingStatus status, LocalDate from, LocalDate to);

    long countByStatusAndRereadTrueAndEndDateBetween(ReadingStatus status, LocalDate from, LocalDate to);

    List<Reading> findByStatusAndEndDateBetween(ReadingStatus status, LocalDate from, LocalDate to);

    /** The goals of one genre count only its books. */
    long countByStatusAndEndDateBetweenAndBookIdIn(
            ReadingStatus status, LocalDate from, LocalDate to, Collection<Long> bookIds);

    long countByStatusAndRereadTrueAndEndDateBetweenAndBookIdIn(
            ReadingStatus status, LocalDate from, LocalDate to, Collection<Long> bookIds);

    List<Reading> findByStatusAndEndDateBetweenAndBookIdIn(
            ReadingStatus status, LocalDate from, LocalDate to, Collection<Long> bookIds);

    /** Which of the books were read to the end at least once. */
    @Query("""
            select distinct r.bookId from Reading r
            where r.status = io.github.brunasanguini.minhalivraria.reading.ReadingStatus.FINISHED
                and r.bookId in :bookIds
            """)
    Set<Long> findFinishedBookIds(Collection<Long> bookIds);
}
