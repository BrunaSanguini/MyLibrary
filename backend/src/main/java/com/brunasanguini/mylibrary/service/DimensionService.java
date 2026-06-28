package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.DimensionRequest;
import com.brunasanguini.mylibrary.dto.response.DimensionResponse;
import com.brunasanguini.mylibrary.entity.Genre;
import com.brunasanguini.mylibrary.entity.RatingDimension;
import com.brunasanguini.mylibrary.repository.GenreRepository;
import com.brunasanguini.mylibrary.repository.RatingDimensionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class DimensionService {

    private final RatingDimensionRepository dimensionRepository;
    private final GenreRepository genreRepository;

    public DimensionService(RatingDimensionRepository dimensionRepository,
                            GenreRepository genreRepository) {
        this.dimensionRepository = dimensionRepository;
        this.genreRepository = genreRepository;
    }

    public List<DimensionResponse> findAll() {
        return dimensionRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<DimensionResponse> findUniversal() {
        return dimensionRepository.findByIsUniversalTrue().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<DimensionResponse> findByGenre(UUID genreId) {
        return dimensionRepository.findByGenreId(genreId).stream()
                .map(this::toResponse)
                .toList();
    }

    public DimensionResponse create(DimensionRequest request) {
        RatingDimension dimension = new RatingDimension();
        dimension.setName(request.name());
        dimension.setDescription(request.description());

        if (request.genreId() != null) {
            Genre genre = genreRepository.findById(request.genreId())
                    .orElseThrow(() -> new RuntimeException("Gênero não encontrado"));
            dimension.setGenre(genre);
            dimension.setIsUniversal(false);
        } else {
            dimension.setIsUniversal(true);
        }

        return toResponse(dimensionRepository.save(dimension));
    }

    public DimensionResponse update(UUID id, DimensionRequest request) {
        RatingDimension dimension = dimensionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dimensão não encontrada"));

        dimension.setName(request.name());
        dimension.setDescription(request.description());

        if (request.genreId() != null) {
            Genre genre = genreRepository.findById(request.genreId())
                    .orElseThrow(() -> new RuntimeException("Gênero não encontrado"));
            dimension.setGenre(genre);
            dimension.setIsUniversal(false);
        } else {
            dimension.setGenre(null);
            dimension.setIsUniversal(true);
        }

        return toResponse(dimensionRepository.save(dimension));
    }

    public void delete(UUID id) {
        dimensionRepository.deleteById(id);
    }

    private DimensionResponse toResponse(RatingDimension dimension) {
        return new DimensionResponse(
                dimension.getId(),
                dimension.getName(),
                dimension.getDescription(),
                dimension.getGenre() != null ? dimension.getGenre().getId() : null,
                dimension.getGenre() != null ? dimension.getGenre().getName() : null
        );
    }
}