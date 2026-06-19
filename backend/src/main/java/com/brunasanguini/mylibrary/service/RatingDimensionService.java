package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.RatingDimensionRequest;
import com.brunasanguini.mylibrary.dto.response.RatingDimensionResponse;
import com.brunasanguini.mylibrary.entity.Genre;
import com.brunasanguini.mylibrary.entity.RatingDimension;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.GenreRepository;
import com.brunasanguini.mylibrary.repository.RatingDimensionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class RatingDimensionService {

    private final RatingDimensionRepository dimensionRepository;
    private final GenreRepository genreRepository;

    public RatingDimensionService(RatingDimensionRepository dimensionRepository,
                                  GenreRepository genreRepository) {
        this.dimensionRepository = dimensionRepository;
        this.genreRepository = genreRepository;
    }

    public List<RatingDimensionResponse> findAll() {
        return dimensionRepository.findAll().stream().map(this::toResponse).toList();
    }

    public RatingDimensionResponse findById(UUID id) {
        RatingDimension dimension = dimensionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dimensão não encontrada"));
        return toResponse(dimension);
    }

    public RatingDimensionResponse create(RatingDimensionRequest request) {
        RatingDimension dimension = new RatingDimension();
        dimension.setName(request.name());
        dimension.setDescription(request.description());
        dimension.setIsUniversal(request.isUniversal());
        dimension.setGenre(resolveGenre(request.genreId()));
        return toResponse(dimensionRepository.save(dimension));
    }

    public RatingDimensionResponse update(UUID id, RatingDimensionRequest request) {
        RatingDimension dimension = dimensionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dimensão não encontrada"));
        dimension.setName(request.name());
        dimension.setDescription(request.description());
        dimension.setIsUniversal(request.isUniversal());
        dimension.setGenre(resolveGenre(request.genreId()));
        return toResponse(dimensionRepository.save(dimension));
    }

    public void delete(UUID id) {
        dimensionRepository.deleteById(id);
    }

    // Resolve o gênero só se um id foi informado (dimensão específica);
    // se for null, é universal e o gênero fica null
    private Genre resolveGenre(UUID genreId) {
        if (genreId == null) {
            return null;
        }
        return genreRepository.findById(genreId)
                .orElseThrow(() -> new ResourceNotFoundException("Gênero não encontrado"));
    }

    private RatingDimensionResponse toResponse(RatingDimension dimension) {
        UUID genreId = dimension.getGenre() != null ? dimension.getGenre().getId() : null;
        String genreName = dimension.getGenre() != null ? dimension.getGenre().getName() : null;
        return new RatingDimensionResponse(
                dimension.getId(),
                dimension.getName(),
                dimension.getDescription(),
                genreId,
                genreName,
                dimension.getIsUniversal()
        );
    }
}