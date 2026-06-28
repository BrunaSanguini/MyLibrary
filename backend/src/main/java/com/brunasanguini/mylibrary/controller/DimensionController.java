package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.DimensionRequest;
import com.brunasanguini.mylibrary.dto.response.DimensionResponse;
import com.brunasanguini.mylibrary.service.DimensionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/dimensions")
public class DimensionController {

    private final DimensionService dimensionService;

    public DimensionController(DimensionService dimensionService) {
        this.dimensionService = dimensionService;
    }

    @GetMapping
    public List<DimensionResponse> findAll() {
        return dimensionService.findAll();
    }

    @GetMapping("/universal")
    public List<DimensionResponse> findUniversal() {
        return dimensionService.findUniversal();
    }

    @GetMapping("/genre/{genreId}")
    public List<DimensionResponse> findByGenre(@PathVariable UUID genreId) {
        return dimensionService.findByGenre(genreId);
    }

    @PostMapping
    public ResponseEntity<DimensionResponse> create(@Valid @RequestBody DimensionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dimensionService.create(request));
    }

    @PutMapping("/{id}")
    public DimensionResponse update(@PathVariable UUID id,
                                    @Valid @RequestBody DimensionRequest request) {
        return dimensionService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        dimensionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}