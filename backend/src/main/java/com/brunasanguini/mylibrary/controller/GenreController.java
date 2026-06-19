package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.GenreRequest;
import com.brunasanguini.mylibrary.dto.response.GenreResponse;
import com.brunasanguini.mylibrary.service.GenreService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/genres")
public class GenreController {

    private final GenreService genreService;

    public GenreController(GenreService genreService) {
        this.genreService = genreService;
    }

    @GetMapping
    public List<GenreResponse> findAll() {
        return genreService.findAll();
    }

    @GetMapping("/{id}")
    public GenreResponse findById(@PathVariable UUID id) {
        return genreService.findById(id);
    }

    @PostMapping
    public ResponseEntity<GenreResponse> create(@Valid @RequestBody GenreRequest request) {
        GenreResponse created = genreService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public GenreResponse update(@PathVariable UUID id, @Valid @RequestBody GenreRequest request) {
        return genreService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        genreService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
