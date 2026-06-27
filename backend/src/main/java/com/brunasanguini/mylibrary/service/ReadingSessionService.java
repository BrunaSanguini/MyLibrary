package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.ReadingSessionResponse;
import com.brunasanguini.mylibrary.entity.Book;
import com.brunasanguini.mylibrary.entity.ReadingSession;
import com.brunasanguini.mylibrary.entity.ReadingStatus;
import com.brunasanguini.mylibrary.repository.BookRepository;
import com.brunasanguini.mylibrary.repository.ReadingSessionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ReadingSessionService {

    private final ReadingSessionRepository readingSessionRepository;
    private final BookRepository bookRepository;

    public ReadingSessionService(ReadingSessionRepository readingSessionRepository,
                                 BookRepository bookRepository) {
        this.readingSessionRepository = readingSessionRepository;
        this.bookRepository = bookRepository;
    }

    // Chamado pelo BookService quando status muda para READING ou REREADING
    public void openSession(Book book) {
        // Se já existe uma sessão aberta, não abre outra
        boolean hasOpenSession = readingSessionRepository
                .findByBookIdAndIsCompletedFalse(book.getId())
                .isPresent();
        if (hasOpenSession) return;

        int completedSessions = readingSessionRepository
                .countByBookIdAndIsCompletedTrue(book.getId());

        ReadingSession session = new ReadingSession();
        session.setBook(book);
        session.setStartDate(LocalDate.now());
        session.setRereadNumber(completedSessions); // 0 na 1ª leitura, 1 na 1ª releitura...
        session.setIsCompleted(false);

        readingSessionRepository.save(session);
    }

    // Chamado pelo BookService quando status muda para READ
    public void closeSession(Book book) {
        readingSessionRepository
                .findByBookIdAndIsCompletedFalse(book.getId())
                .ifPresent(session -> {
                    session.setEndDate(LocalDate.now());
                    session.setIsCompleted(true);
                    readingSessionRepository.save(session);
                });
    }

    // Retorna todo o histórico de leituras de um livro
    public List<ReadingSessionResponse> findByBook(UUID bookId) {
        return readingSessionRepository
                .findByBookIdOrderByRereadNumberAsc(bookId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private ReadingSessionResponse toResponse(ReadingSession session) {
        return new ReadingSessionResponse(
                session.getId(),
                session.getBook().getId(),
                session.getBook().getTitle(),
                session.getStartDate(),
                session.getEndDate(),
                session.getDaysToRead(),
                session.getRereadNumber(),
                session.getIsCompleted(),
                session.getCreatedAt()
        );
    }
}