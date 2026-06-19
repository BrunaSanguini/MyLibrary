package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.ReviewRequest;
import com.brunasanguini.mylibrary.dto.response.ReviewResponse;
import com.brunasanguini.mylibrary.entity.Book;
import com.brunasanguini.mylibrary.entity.Review;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.BookRepository;
import com.brunasanguini.mylibrary.repository.ReviewRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookRepository bookRepository;

    public ReviewService(ReviewRepository reviewRepository, BookRepository bookRepository) {
        this.reviewRepository = reviewRepository;
        this.bookRepository = bookRepository;
    }

    public List<ReviewResponse> findAll() {
        return reviewRepository.findAll().stream().map(this::toResponse).toList();
    }

    public ReviewResponse findById(UUID id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resenha não encontrada"));
        return toResponse(review);
    }

    public ReviewResponse create(ReviewRequest request) {
        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));

        Review review = new Review();
        review.setBook(book);
        review.setContent(request.content());
        review.setWouldReread(request.wouldReread());
        review.setWouldRecommend(request.wouldRecommend());
        review.setIsFavorite(request.isFavorite());
        return toResponse(reviewRepository.save(review));
    }

    public ReviewResponse update(UUID id, ReviewRequest request) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resenha não encontrada"));
        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));

        review.setBook(book);
        review.setContent(request.content());
        review.setWouldReread(request.wouldReread());
        review.setWouldRecommend(request.wouldRecommend());
        review.setIsFavorite(request.isFavorite());
        return toResponse(reviewRepository.save(review));
    }

    public void delete(UUID id) {
        reviewRepository.deleteById(id);
    }

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getBook().getId(),
                review.getContent(),
                review.getWouldReread(),
                review.getWouldRecommend(),
                review.getIsFavorite()
        );
    }
}