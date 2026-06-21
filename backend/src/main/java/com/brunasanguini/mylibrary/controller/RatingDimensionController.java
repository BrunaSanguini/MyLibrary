package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.RatingDimensionRequest;
import com.brunasanguini.mylibrary.dto.response.RatingDimensionResponse;
import com.brunasanguini.mylibrary.service.RatingDimensionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rating-dimensions")
public class RatingDimensionController {


    private final RatingDimensionService ratingDimensionService;

    public RatingDimensionController(RatingDimensionService ratingDimensionService) {
        this.ratingDimensionService = ratingDimensionService;
    }

    @GetMapping
    public List<RatingDimensionResponse> findAll() {
        return ratingDimensionService.findAll();
    }

    
    @GetMapping("/{id}")
    public RatingDimensionResponse findById(@PathVariable UUID id) {
        return ratingDimensionService.findById(id);
    }

    @PostMapping
    public ResponseEntity<RatingDimensionResponse> create(@Valid @RequestBody RatingDimensionRequest request) {
        RatingDimensionResponse created = ratingDimensionService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public RatingDimensionResponse update(@PathVariable UUID id, @Valid @RequestBody RatingDimensionRequest request) {
        return ratingDimensionService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        ratingDimensionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
