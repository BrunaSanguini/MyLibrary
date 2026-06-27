package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.GenreRequest;
import com.brunasanguini.mylibrary.dto.response.GenreResponse;
import com.brunasanguini.mylibrary.entity.Genre;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.GenreRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class GenreService {

    private final GenreRepository genreRepository;

    public GenreService(GenreRepository genreRepository) {
        this.genreRepository = genreRepository;
    }

    public List<GenreResponse> findAll() {
        return genreRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public GenreResponse findById(UUID id){
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gênero não encontrado"));
        return toResponse(genre);
    }

    public GenreResponse create(GenreRequest request){
        Genre genre = new Genre();
        genre.setName(request.name());
        Genre saved = genreRepository.save(genre);
        return toResponse(saved);
    }

    public  GenreResponse update(UUID id, GenreRequest request){
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gênero não encontrado"));
        genre.setName(request.name());
        Genre saved = genreRepository.save(genre);
        return toResponse(saved);
    }

    public void delete(UUID id){
        genreRepository.deleteById(id);
    }

    public GenreResponse toResponse(Genre genre) {
        return new GenreResponse(
                genre.getId(),
                genre.getName(),
                genre.getParent() != null ? genre.getParent().getId() : null
        );
    }



}
