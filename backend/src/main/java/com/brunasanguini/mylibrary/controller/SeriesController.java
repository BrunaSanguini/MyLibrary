package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.SeriesRequest;
import com.brunasanguini.mylibrary.dto.response.SeriesResponse;
import com.brunasanguini.mylibrary.service.SeriesService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/series")
public class SeriesController {

    private final SeriesService seriesService;

    public SeriesController(SeriesService seriesService) {
        this.seriesService = seriesService;
    }

    @GetMapping
    public List<SeriesResponse> findAll() {
        return seriesService.findAll();
    }

    @GetMapping("/{id}")
    public SeriesResponse findById(@PathVariable UUID id) {
        return seriesService.findById(id);
    }

    @PostMapping
    public ResponseEntity<SeriesResponse> create(@Valid @RequestBody SeriesRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(seriesService.create(request));
    }

    @PutMapping("/{id}")
    public SeriesResponse update(@PathVariable UUID id, @Valid @RequestBody SeriesRequest request) {
        return seriesService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        seriesService.delete(id);
        return ResponseEntity.noContent().build();
    }
}