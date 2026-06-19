package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.AuthorRequest;
import com.brunasanguini.mylibrary.dto.response.AuthorResponse;
import com.brunasanguini.mylibrary.service.AuthorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/authors")
public class AuthorController {

    private final AuthorService authorService;

    public AuthorController(AuthorService authorService) {
        this.authorService = authorService;
    }

    // GET /api/authors
    @GetMapping
    public List<AuthorResponse> findAll() {
        return authorService.findAll();
    }

    // GET /api/authors/{id}
    @GetMapping("/{id}")
    public AuthorResponse findById(@PathVariable UUID id) {
        return authorService.findById(id);
    }

    // POST /api/authors
    @PostMapping
    public ResponseEntity<AuthorResponse> create(@Valid @RequestBody AuthorRequest request) {
        AuthorResponse created = authorService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // PUT /api/authors/{id}
    @PutMapping("/{id}")
    public AuthorResponse update(@PathVariable UUID id, @Valid @RequestBody AuthorRequest request) {
        return authorService.update(id, request);
    }

    // DELETE /api/authors/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        authorService.delete(id);
        return ResponseEntity.noContent().build();
    }
}