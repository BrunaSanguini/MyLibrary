package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.BookRatingsSummary;
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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    // Salva ou atualiza nota de uma dimensão para um livro (upsert)
    public RatingResponse rate(UUID bookId, RatingRequest request) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));


        RatingDimension dimension = dimensionRepository.findById(request.dimensionId())
                .orElseThrow(() -> new RuntimeException("Dimensão não encontrada"));

        // Upsert — atualiza se já existe, cria se não existe
        Rating rating = ratingRepository
                .findByBookIdAndDimension_Id(bookId, request.dimensionId())
                .orElse(new Rating());

        rating.setBook(book);
        rating.setDimension(dimension);
        rating.setScore(BigDecimal.valueOf(request.score()));

        return toResponse(ratingRepository.save(rating));
    }

    // Retorna todas as notas de um livro
    public List<RatingResponse> findByBook(UUID bookId) {
        return ratingRepository.findByBookId(bookId).stream()
                .map(this::toResponse)
                .toList();
    }

    // Nota final = média das dimensões avaliadas (RN-045)
    public Double getFinalScore(UUID bookId) {
        List<Rating> ratings = ratingRepository.findByBookId(bookId);
        if (ratings.isEmpty()) return null;
        return ratings.stream()
                .mapToDouble(r -> r.getScore().doubleValue())
                .average()
                .orElse(0.0);
    }

    // Estrelas = nota final / 2, arredondado para 1 casa (RN-046)
    public Double getStars(UUID bookId) {
        Double finalScore = getFinalScore(bookId);
        if (finalScore == null) return null;
        return Math.round((finalScore / 2.0) * 10.0) / 10.0;
    }

    // Resumo completo: notas + nota final + estrelas
    public BookRatingsSummary getSummary(UUID bookId) {
        List<RatingResponse> ratings = findByBook(bookId);
        Double finalScore = getFinalScore(bookId);
        Double stars = getStars(bookId);
        return new BookRatingsSummary(ratings, finalScore, stars);
    }

    @Transactional
    public void deleteByBook(UUID bookId) {
        ratingRepository.deleteByBookId(bookId);
    }

    private RatingResponse toResponse(Rating rating) {
        return new RatingResponse(
                rating.getId(),
                rating.getDimension().getId(),
                rating.getDimension().getName(),
                rating.getScore().doubleValue()
        );
    }
}