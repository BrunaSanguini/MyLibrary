package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.ReadingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReadingSessionRepository extends JpaRepository<ReadingSession, UUID> {

    List<ReadingSession> findByBookIdOrderByRereadNumberAsc(UUID bookId);

    // Busca a sessão aberta (sem endDate) de um livro
    Optional<ReadingSession> findByBookIdAndIsCompletedFalse(UUID bookId);

    // Conta quantas sessões completas um livro tem (para calcular rereadNumber)
    Integer countByBookIdAndIsCompletedTrue(UUID bookId);
}