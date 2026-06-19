package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.ReadingSessionRequest;
import com.brunasanguini.mylibrary.dto.response.ReadingSessionResponse;
import com.brunasanguini.mylibrary.entity.Book;
import com.brunasanguini.mylibrary.entity.ReadingSession;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.BookRepository;
import com.brunasanguini.mylibrary.repository.ReadingSessionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ReadingSessionService {

    private final ReadingSessionRepository sessionRepository;
    private final BookRepository bookRepository;

    public ReadingSessionService(ReadingSessionRepository sessionRepository,
                                 BookRepository bookRepository) {
        this.sessionRepository = sessionRepository;
        this.bookRepository = bookRepository;
    }

    public List<ReadingSessionResponse> findAll() {
        return sessionRepository.findAll().stream().map(this::toResponse).toList();
    }

    public ReadingSessionResponse findById(UUID id) {
        ReadingSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão de leitura não encontrada"));
        return toResponse(session);
    }

    public ReadingSessionResponse create(ReadingSessionRequest request) {
        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));

        ReadingSession session = new ReadingSession();
        session.setBook(book);
        session.setStartDate(request.startDate());
        session.setEndDate(request.endDate());
        session.setPagesRead(request.pagesRead());
        return toResponse(sessionRepository.save(session));
    }

    public ReadingSessionResponse update(UUID id, ReadingSessionRequest request) {
        ReadingSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão de leitura não encontrada"));
        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));

        session.setBook(book);
        session.setStartDate(request.startDate());
        session.setEndDate(request.endDate());
        session.setPagesRead(request.pagesRead());
        return toResponse(sessionRepository.save(session));
    }

    public void delete(UUID id) {
        sessionRepository.deleteById(id);
    }

    private ReadingSessionResponse toResponse(ReadingSession session) {
        return new ReadingSessionResponse(
                session.getId(),
                session.getBook().getId(),
                session.getStartDate(),
                session.getEndDate(),
                session.getPagesRead()
        );
    }
}