package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.ReadingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReadingSessionRepository extends JpaRepository<ReadingSession, UUID> {

    List<ReadingSession> findByBookIdOrderByRereadNumberAsc(UUID bookId);

    Optional<ReadingSession> findByBookIdAndIsCompletedFalse(UUID bookId);

    Integer countByBookIdAndIsCompletedTrue(UUID bookId);

    // Sessões completas do ano corrente
    @Query("SELECT rs FROM ReadingSession rs WHERE rs.isCompleted = true " +
            "AND YEAR(rs.endDate) = :year")
    List<ReadingSession> findCompletedByYear(int year);

    // Todas as sessões completas (para tempo médio)
    List<ReadingSession> findByIsCompletedTrue();
}