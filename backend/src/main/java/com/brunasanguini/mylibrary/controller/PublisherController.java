package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.PublisherRequest;
import com.brunasanguini.mylibrary.dto.response.PublisherResponse;
import com.brunasanguini.mylibrary.service.PublisherService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/publishers")
public class PublisherController {

    private final PublisherService publisherService;

    public PublisherController(PublisherService publisherService) {
        this.publisherService = publisherService;
    }

    @GetMapping
    public List<PublisherResponse> findAll() {
        return publisherService.findAll();
    }

    @GetMapping("/{id}")
    public PublisherResponse findById(@PathVariable UUID id) {
        return publisherService.findById(id);
    }

    @PostMapping
    public ResponseEntity<PublisherResponse> create(@Valid @RequestBody PublisherRequest request) {
        PublisherResponse created = publisherService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public PublisherResponse update(@PathVariable UUID id, @Valid @RequestBody PublisherRequest request) {
        return publisherService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        publisherService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
