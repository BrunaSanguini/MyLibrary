package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.RatingRequest;
import com.brunasanguini.mylibrary.dto.response.RatingResponse;
import com.brunasanguini.mylibrary.service.RatingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

        import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ratings")
public class RatingController {

    private final RatingService ratingService;

    public RatingController(RatingService ratingService) {
        this.ratingService = ratingService;
    }

    @GetMapping
    public List<RatingResponse> findAll() {
        return ratingService.findAll();
    }

    @GetMapping("/{id}")
    public RatingResponse findById(@PathVariable UUID id) {
        return ratingService.findById(id);
    }

    @PostMapping
    public ResponseEntity<RatingResponse> create(@Valid @RequestBody RatingRequest request) {
        RatingResponse created = ratingService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public RatingResponse update(@PathVariable UUID id, @Valid @RequestBody RatingRequest request) {
        return ratingService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        ratingService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
