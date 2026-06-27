package com.brunasanguini.mylibrary.service;


import com.brunasanguini.mylibrary.dto.BookRequest;
import com.brunasanguini.mylibrary.dto.response.AuthorResponse;
import com.brunasanguini.mylibrary.dto.response.BookResponse;
import com.brunasanguini.mylibrary.dto.response.GenreResponse;
import com.brunasanguini.mylibrary.entity.*;
import com.brunasanguini.mylibrary.repository.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BookService {

    private final BookRepository bookRepository;
    private final AuthorRepository authorRepository;
    private final GenreRepository genreRepository;
    private final PublisherRepository publisherRepository;
    private final SeriesRepository seriesRepository;
    private final ReadingSessionService readingSessionService;

    public BookService(BookRepository bookRepository,
                       AuthorRepository authorRepository,
                       GenreRepository genreRepository,
                       PublisherRepository publisherRepository,
                       SeriesRepository seriesRepository,
                       ReadingSessionService readingSessionService) {
        this.bookRepository = bookRepository;
        this.authorRepository = authorRepository;
        this.genreRepository = genreRepository;
        this.publisherRepository = publisherRepository;
        this.seriesRepository = seriesRepository;
        this.readingSessionService = readingSessionService;
    }

    public List<BookResponse> findAll() {
        return bookRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public BookResponse findById(UUID id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Livro não encontrado"));
        return toResponse(book);
    }

    public BookResponse create(BookRequest request) {
        // RN-010: ISBN único
        if (request.isbn() != null && bookRepository.existsByIsbn(request.isbn())) {
            throw new IllegalArgumentException("Já existe um livro com esse ISBN");
        }

        Book book = new Book();
        fillBook(book, request);
        return toResponse(bookRepository.save(book));
    }

    public BookResponse update(UUID id, BookRequest request) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Livro não encontrado"));

        // RN-010: ISBN único, mas permite manter o mesmo ISBN do próprio livro
        if (request.isbn() != null
                && !request.isbn().equals(book.getIsbn())
                && bookRepository.existsByIsbn(request.isbn())) {
            throw new IllegalArgumentException("Já existe um livro com esse ISBN");
        }

        fillBook(book, request);
        return toResponse(bookRepository.save(book));
    }

    public void delete(UUID id) {
        bookRepository.deleteById(id);
    }

    public List<BookResponse> findByStatus(ReadingStatus status) {
        return bookRepository.findByReadingStatus(status).stream()
                .map(this::toResponse)
                .toList();
    }

    // ── Métodos privados ─────────────────────────────────────────────────

    private void fillBook(Book book, BookRequest request) {
        book.setTitle(request.title());
        book.setIsbn(request.isbn());
        book.setPageCount(request.pageCount());
        book.setLanguage(request.language());
        book.setSynopsis(request.synopsis());
        book.setCoverUrl(request.coverUrl());
        book.setPublicationYear(request.publicationYear());
        book.setTags(request.tags() != null ? request.tags() : Set.of());
        book.setWouldReread(request.wouldReread());
        book.setWouldRecommend(request.wouldRecommend());
        book.setIsFavorite(request.isFavorite());
        book.setReview(request.review());

        // Transição de status com controle de sessões (RN-032, RN-033, RN-035)
        if (request.readingStatus() != null) {
            ReadingStatus novoStatus = request.readingStatus();
            ReadingStatus statusAtual = book.getReadingStatus();

            book.setReadingStatus(novoStatus);

            // Abre sessão ao começar a ler ou reler
            if (novoStatus == ReadingStatus.READING || novoStatus == ReadingStatus.REREADING) {
                readingSessionService.openSession(book);
                if (novoStatus == ReadingStatus.REREADING) {
                    book.setRereadCount(book.getRereadCount() + 1); // RN-033
                }
            }

            // Fecha sessão ao marcar como lido
            if (novoStatus == ReadingStatus.READ) {
                readingSessionService.closeSession(book);
            }
        }

        // Autores
        Set<Author> authors = authorRepository.findAllById(request.authorIds())
                .stream().collect(Collectors.toSet());
        book.setAuthors(authors);

        // Gêneros (opcional)
        if (request.genreIds() != null && !request.genreIds().isEmpty()) {
            Set<Genre> genres = genreRepository.findAllById(request.genreIds())
                    .stream().collect(Collectors.toSet());
            book.setGenres(genres);
        }

        // Editora (opcional)
        if (request.publisherId() != null) {
            Publisher publisher = publisherRepository.findById(request.publisherId())
                    .orElseThrow(() -> new RuntimeException("Editora não encontrada"));
            book.setPublisher(publisher);
        }

        // Série (opcional) — RN-021: volumeNumber ≤ totalVolumes é validado aqui
        if (request.seriesId() != null) {
            Series series = seriesRepository.findById(request.seriesId())
                    .orElseThrow(() -> new RuntimeException("Série não encontrada"));
            if (request.volumeNumber() != null
                    && series.getTotalVolumes() != null
                    && request.volumeNumber() > series.getTotalVolumes()) {
                throw new IllegalArgumentException(
                        "O número do volume não pode ser maior que o total de volumes da série");
            }
            book.setSeries(series);
            book.setVolumeNumber(request.volumeNumber());
        }
    }

    private BookResponse toResponse(Book book) {
        Set<AuthorResponse> authors = book.getAuthors().stream()
                .map(a -> new AuthorResponse(a.getId(), a.getName(), a.getBio(), a.getBirthDate()))
                .collect(Collectors.toSet());

        Set<GenreResponse> genres = book.getGenres().stream()
                .map(g -> new GenreResponse(
                        g.getId(),
                        g.getName(),
                        g.getParent() != null ? g.getParent().getId() : null))
                .collect(Collectors.toSet());

        return new BookResponse(
                book.getId(),
                book.getTitle(),
                book.getIsbn(),
                book.getPageCount(),
                book.getLanguage(),
                book.getSynopsis(),
                book.getCoverUrl(),
                book.getPublicationYear(),
                authors,
                genres,
                book.getPublisher() != null ? book.getPublisher().getName() : null,
                book.getSeries() != null ? book.getSeries().getName() : null,
                book.getVolumeNumber(),
                book.getTags(),
                book.getReadingStatus(),
                book.getRereadCount(),
                book.getWouldReread(),
                book.getWouldRecommend(),
                book.getIsFavorite(),
                book.getReview(),
                book.getCreatedAt(),
                book.getUpdatedAt()
        );
    }
}