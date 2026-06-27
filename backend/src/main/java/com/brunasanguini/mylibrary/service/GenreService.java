package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.GenreRequest;
import com.brunasanguini.mylibrary.dto.response.GenreResponse;
import com.brunasanguini.mylibrary.entity.Genre;
import com.brunasanguini.mylibrary.repository.BookRepository;
import com.brunasanguini.mylibrary.repository.GenreRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class GenreService {

    private final GenreRepository genreRepository;
    private final BookRepository bookRepository;

    public GenreService(GenreRepository genreRepository, BookRepository bookRepository) {
        this.genreRepository = genreRepository;
        this.bookRepository = bookRepository;
    }

    public List<GenreResponse> findAll() {
        return genreRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public GenreResponse findById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    public GenreResponse create(GenreRequest request) {
        Genre genre = new Genre();
        genre.setName(request.name());

        if (request.parentId() != null) {
            Genre parent = findOrThrow(request.parentId());
            // RN-061: subgênero só pode ter um gênero pai (não outro subgênero)
            if (parent.getParent() != null) {
                throw new IllegalArgumentException("Um subgênero não pode ser pai de outro subgênero");
            }
            genre.setParent(parent);
        }

        return toResponse(genreRepository.save(genre));
    }

    public GenreResponse update(UUID id, GenreRequest request) {
        Genre genre = findOrThrow(id);
        genre.setName(request.name());

        if (request.parentId() != null) {
            Genre parent = findOrThrow(request.parentId());
            if (parent.getParent() != null) {
                throw new IllegalArgumentException("Um subgênero não pode ser pai de outro subgênero");
            }
            genre.setParent(parent);
        } else {
            genre.setParent(null);
        }

        return toResponse(genreRepository.save(genre));
    }

    public void delete(UUID id) {
        // RN-062: só pode deletar se não houver livros associados
        if (bookRepository.existsByGenresId(id)) {
            throw new IllegalStateException("Não é possível excluir um gênero com livros associados");
        }
        genreRepository.deleteById(id);
    }

    private Genre findOrThrow(UUID id) {
        return genreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Gênero não encontrado"));
    }

    private GenreResponse toResponse(Genre genre) {
        return new GenreResponse(
                genre.getId(),
                genre.getName(),
                genre.getParent() != null ? genre.getParent().getId() : null
        );
    }
}