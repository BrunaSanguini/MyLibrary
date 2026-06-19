package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.SubgenreRequest;
import com.brunasanguini.mylibrary.dto.response.SubgenreResponse;
import com.brunasanguini.mylibrary.entity.Genre;
import com.brunasanguini.mylibrary.entity.Subgenre;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.GenreRepository;
import com.brunasanguini.mylibrary.repository.SubgenreRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class SubgenreService {

    private final SubgenreRepository subgenreRepository;
    private final GenreRepository genreRepository;

    public SubgenreService(SubgenreRepository subgenreRepository,
                           GenreRepository genreRepository) {
        this.subgenreRepository = subgenreRepository;
        this.genreRepository = genreRepository;
    }

    public List<SubgenreResponse> findAll() {
        return subgenreRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SubgenreResponse findById(UUID id) {
        Subgenre subgenre = subgenreRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subgênero não encontrado"));
        return toResponse(subgenre);
    }

    public SubgenreResponse create(SubgenreRequest request) {
        Genre genre = genreRepository.findById(request.genreId())
                .orElseThrow(() -> new ResourceNotFoundException("Gênero pai não encontrado"));

        Subgenre subgenre = new Subgenre();
        subgenre.setName(request.name());
        subgenre.setGenre(genre);

        Subgenre saved = subgenreRepository.save(subgenre);
        return toResponse(saved);
    }

    public SubgenreResponse update(UUID id, SubgenreRequest request) {
        Subgenre subgenre = subgenreRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subgênero não encontrado"));

        Genre genre = genreRepository.findById(request.genreId())
                .orElseThrow(() -> new ResourceNotFoundException("Gênero pai não encontrado"));

        subgenre.setName(request.name());
        subgenre.setGenre(genre);

        Subgenre saved = subgenreRepository.save(subgenre);
        return toResponse(saved);
    }

    public void delete(UUID id) {
        subgenreRepository.deleteById(id);
    }

    private SubgenreResponse toResponse(Subgenre subgenre) {
        return new SubgenreResponse(
                subgenre.getId(),
                subgenre.getName(),
                subgenre.getGenre().getId(),
                subgenre.getGenre().getName()
        );
    }
}