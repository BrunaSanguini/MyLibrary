package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.ReadingSessionRequest;
import com.brunasanguini.mylibrary.dto.response.ReadingSessionResponse;
import com.brunasanguini.mylibrary.service.ReadingSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reading-sessions")
public class ReadingSessionController {

    private final ReadingSessionService readingSessionService;

    public ReadingSessionController(ReadingSessionService readingSessionService) {
        this.readingSessionService = readingSessionService;
    }

    @GetMapping
    public List<ReadingSessionResponse> findAll() {
        return readingSessionService.findAll();
    }

    @GetMapping("/{id}")
    public ReadingSessionResponse findById(@PathVariable UUID id) {
        return readingSessionService.findById(id);
    }

    @PostMapping
    public ResponseEntity<ReadingSessionResponse> create(@Valid @RequestBody ReadingSessionRequest request) {
        ReadingSessionResponse created = readingSessionService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ReadingSessionResponse update(@PathVariable UUID id, @Valid @RequestBody ReadingSessionRequest request) {
        return readingSessionService.update(id, request);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        readingSessionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}