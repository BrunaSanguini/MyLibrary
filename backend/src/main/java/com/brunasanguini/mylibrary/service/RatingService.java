package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.RatingRequest;
import com.brunasanguini.mylibrary.dto.response.RatingResponse;
import com.brunasanguini.mylibrary.entity.Book;
import com.brunasanguini.mylibrary.entity.Rating;
import com.brunasanguini.mylibrary.entity.RatingDimension;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.BookRepository;
import com.brunasanguini.mylibrary.repository.RatingDimensionRepository;
import com.brunasanguini.mylibrary.repository.RatingRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class RatingService {

    private final RatingRepository ratingRepository;
    private final BookRepository bookRepository;
    private final RatingDimensionRepository dimensionRepository;

    public RatingService(RatingRepository ratingRepository,
                         BookRepository bookRepository,
                         RatingDimensionRepository dimensionRepository) {
        this.ratingRepository = ratingRepository;
        this.bookRepository = bookRepository;
        this.dimensionRepository = dimensionRepository;
    }

    public List<RatingResponse> findAll() {
        return ratingRepository.findAll().stream().map(this::toResponse).toList();
    }

    public RatingResponse findById(UUID id) {
        Rating rating = ratingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada"));
        return toResponse(rating);
    }

    public RatingResponse create(RatingRequest request) {
        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));
        RatingDimension dimension = dimensionRepository.findById(request.dimensionId())
                .orElseThrow(() -> new ResourceNotFoundException("Dimensão não encontrada"));

        Rating rating = new Rating();
        rating.setBook(book);
        rating.setDimension(dimension);
        rating.setScore(request.score());
        return toResponse(ratingRepository.save(rating));
    }

    public RatingResponse update(UUID id, RatingRequest request) {
        Rating rating = ratingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação não encontrada"));
        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));
        RatingDimension dimension = dimensionRepository.findById(request.dimensionId())
                .orElseThrow(() -> new ResourceNotFoundException("Dimensão não encontrada"));

        rating.setBook(book);
        rating.setDimension(dimension);
        rating.setScore(request.score());
        return toResponse(ratingRepository.save(rating));
    }

    public void delete(UUID id) {
        ratingRepository.deleteById(id);
    }

    private RatingResponse toResponse(Rating rating) {
        return new RatingResponse(
                rating.getId(),
                rating.getBook().getId(),
                rating.getDimension().getId(),
                rating.getDimension().getName(),
                rating.getScore()
        );
    }
}