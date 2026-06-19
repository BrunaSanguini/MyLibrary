package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.response.*;
import com.brunasanguini.mylibrary.dto.request.BookRequest;
import com.brunasanguini.mylibrary.dto.response.BookResponse;
import com.brunasanguini.mylibrary.entity.*;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class BookService {

    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final PublisherRepository publisherRepository;
    private final LanguageRepository languageRepository;
    private final SeriesRepository seriesRepository;
    private final AuthorRepository authorRepository;
    private final GenreRepository genreRepository;
    private final SubgenreRepository subgenreRepository;
    private final TagRepository tagRepository;

    public BookService(BookRepository bookRepository,
                       UserRepository userRepository,
                       PublisherRepository publisherRepository,
                       LanguageRepository languageRepository,
                       SeriesRepository seriesRepository,
                       AuthorRepository authorRepository,
                       GenreRepository genreRepository,
                       SubgenreRepository subgenreRepository,
                       TagRepository tagRepository) {
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.publisherRepository = publisherRepository;
        this.languageRepository = languageRepository;
        this.seriesRepository = seriesRepository;
        this.authorRepository = authorRepository;
        this.genreRepository = genreRepository;
        this.subgenreRepository = subgenreRepository;
        this.tagRepository = tagRepository;
    }

    public List<BookResponse> findAll() {
        return bookRepository.findAll().stream().map(this::toResponse).toList();
    }

    public BookResponse findById(UUID id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));
        return toResponse(book);
    }

    public BookResponse create(BookRequest request) {
        Book book = new Book();
        applyRequest(book, request);
        book.setRereadCount(0); // novo livro começa com 0 releituras
        return toResponse(bookRepository.save(book));
    }

    public BookResponse update(UUID id, BookRequest request) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));
        applyRequest(book, request);
        return toResponse(bookRepository.save(book));
    }

    public void delete(UUID id) {
        bookRepository.deleteById(id);
    }

    // Aplica os dados do request à entidade, resolvendo todas as referências
    private void applyRequest(Book book, BookRequest request) {
        // O usuário dono será definido pelo contexto de autenticação futuramente.
        // Por enquanto, buscamos o primeiro usuário como placeholder de desenvolvimento.
        // (Será substituído quando a autenticação JWT estiver pronta.)

        book.setTitle(request.title());
        book.setIsbn(request.isbn());
        book.setPages(request.pages());
        book.setCoverUrl(request.coverUrl());
        book.setStatus(request.status());
        book.setVolumeNumber(request.volumeNumber());

        // Referências únicas (opcionais)
        book.setPublisher(request.publisherId() == null ? null :
                publisherRepository.findById(request.publisherId())
                        .orElseThrow(() -> new ResourceNotFoundException("Editora não encontrada")));

        book.setLanguage(request.languageId() == null ? null :
                languageRepository.findById(request.languageId())
                        .orElseThrow(() -> new ResourceNotFoundException("Idioma não encontrado")));

        book.setSeries(request.seriesId() == null ? null :
                seriesRepository.findById(request.seriesId())
                        .orElseThrow(() -> new ResourceNotFoundException("Série não encontrada")));

        // Relações N:N — resolve listas inteiras
        if (request.authorIds() != null) {
            book.setAuthors(authorRepository.findAllById(request.authorIds()));
        }
        if (request.genreIds() != null) {
            book.setGenres(genreRepository.findAllById(request.genreIds()));
        }
        if (request.subgenreIds() != null) {
            book.setSubgenres(subgenreRepository.findAllById(request.subgenreIds()));
        }
        if (request.tagIds() != null) {
            book.setTags(tagRepository.findAllById(request.tagIds()));
        }
    }

    private BookResponse toResponse(Book book) {
        List<AuthorResponse> authors = book.getAuthors() == null ? List.of() :
                book.getAuthors().stream()
                        .map(a -> new AuthorResponse(a.getId(), a.getName(), a.getBio(), a.getBirthDate()))
                        .toList();

        List<GenreResponse> genres = book.getGenres() == null ? List.of() :
                book.getGenres().stream()
                        .map(g -> new GenreResponse(g.getId(), g.getName()))
                        .toList();

        List<SubgenreResponse> subgenres = book.getSubgenres() == null ? List.of() :
                book.getSubgenres().stream()
                        .map(s -> new SubgenreResponse(s.getId(), s.getName(),
                                s.getGenre().getId(), s.getGenre().getName()))
                        .toList();

        List<TagResponse> tags = book.getTags() == null ? List.of() :
                book.getTags().stream()
                        .map(t -> new TagResponse(t.getId(), t.getName()))
                        .toList();

        return new BookResponse(
                book.getId(),
                book.getTitle(),
                book.getIsbn(),
                book.getPages(),
                book.getCoverUrl(),
                book.getStatus(),
                book.getPublisher() != null ? book.getPublisher().getName() : null,
                book.getLanguage() != null ? book.getLanguage().getName() : null,
                book.getSeries() != null ? book.getSeries().getName() : null,
                book.getVolumeNumber(),
                book.getRereadCount(),
                authors,
                genres,
                subgenres,
                tags
        );
    }
}