package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.SubgenreRequest;
import com.brunasanguini.mylibrary.dto.response.SubgenreResponse;
import com.brunasanguini.mylibrary.service.SubgenreService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/subgenres")
public class SubgenreController {

    private final SubgenreService subgenreService;

    public SubgenreController(SubgenreService subgenreService) {
        this.subgenreService = subgenreService;
    }

    @GetMapping
    public List<SubgenreResponse> findAll() {
        return subgenreService.findAll();
    }

    @GetMapping("/{id}")
    public SubgenreResponse findById(@PathVariable UUID id) {
        return subgenreService.findById(id);
    }

    @PostMapping
    public ResponseEntity<SubgenreResponse> create(@Valid @RequestBody SubgenreRequest request) {
        SubgenreResponse created = subgenreService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public SubgenreResponse update(@PathVariable UUID id, @Valid @RequestBody SubgenreRequest request) {
        return subgenreService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        subgenreService.delete(id);
        return ResponseEntity.noContent().build();
    }
}