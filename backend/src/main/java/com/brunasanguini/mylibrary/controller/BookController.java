package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.BookRequest;
import com.brunasanguini.mylibrary.dto.response.BookResponse;
import com.brunasanguini.mylibrary.entity.ReadingStatus;
import com.brunasanguini.mylibrary.service.BookService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService bookService;

    public BookController(BookService bookService) {
        this.bookService = bookService;
    }

    // GET /api/books
    @GetMapping
    public List<BookResponse> findAll() {
        return bookService.findAll();
    }

    // GET /api/books/{id}
    @GetMapping("/{id}")
    public BookResponse findById(@PathVariable UUID id) {
        return bookService.findById(id);
    }

    // GET /api/books?status=READ
    @GetMapping(params = "status")
    public List<BookResponse> findByStatus(@RequestParam ReadingStatus status) {
        return bookService.findByStatus(status);
    }

    // POST /api/books
    @PostMapping
    public ResponseEntity<BookResponse> create(@Valid @RequestBody BookRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.create(request));
    }

    // PUT /api/books/{id}
    @PutMapping("/{id}")
    public BookResponse update(@PathVariable UUID id, @Valid @RequestBody BookRequest request) {
        return bookService.update(id, request);
    }

    // DELETE /api/books/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        bookService.delete(id);
        return ResponseEntity.noContent().build();
    }
}