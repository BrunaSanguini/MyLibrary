package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.AuthorRequest;
import com.brunasanguini.mylibrary.dto.request.LanguageRequest;
import com.brunasanguini.mylibrary.dto.response.AuthorResponse;
import com.brunasanguini.mylibrary.dto.response.LanguageResponse;
import com.brunasanguini.mylibrary.service.LanguageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/languages")
public class LanguageController {

    private final LanguageService languageService;

    public LanguageController(LanguageService languageService) {
        this.languageService = languageService;
    }

    public List<LanguageResponse> getAllLanguages() {
        return languageService.findAll();
    }

    @GetMapping("/{id}")
    public LanguageResponse findById(@PathVariable UUID id) {
        return languageService.findById(id);
    }

    @PostMapping
    public ResponseEntity<LanguageResponse> create(@Valid @RequestBody LanguageRequest request) {
        LanguageResponse created = languageService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public LanguageResponse update(@PathVariable UUID id, @Valid @RequestBody LanguageRequest request) {
        return languageService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        languageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
