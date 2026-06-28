package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.BookRatingsSummary;
import com.brunasanguini.mylibrary.dto.request.RatingRequest;
import com.brunasanguini.mylibrary.dto.response.RatingResponse;
import com.brunasanguini.mylibrary.service.RatingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/books/{bookId}/ratings")
public class RatingController {

    private final RatingService ratingService;

    public RatingController(RatingService ratingService) {
        this.ratingService = ratingService;
    }

    // GET /api/books/{bookId}/ratings
    @GetMapping
    public BookRatingsSummary getSummary(@PathVariable UUID bookId) {
        return ratingService.getSummary(bookId);
    }

    // POST /api/books/{bookId}/ratings
    @PostMapping
    public ResponseEntity<RatingResponse> rate(@PathVariable UUID bookId,
                                               @Valid @RequestBody RatingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ratingService.rate(bookId, request));
    }

    // DELETE /api/books/{bookId}/ratings
    @DeleteMapping
    public ResponseEntity<Void> deleteAll(@PathVariable UUID bookId) {
        ratingService.deleteByBook(bookId);
        return ResponseEntity.noContent().build();
    }
}