package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.ReadingSessionResponse;
import com.brunasanguini.mylibrary.service.ReadingSessionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/books/{bookId}/sessions")
public class ReadingSessionController {

    private final ReadingSessionService readingSessionService;

    public ReadingSessionController(ReadingSessionService readingSessionService) {
        this.readingSessionService = readingSessionService;
    }

    // GET /api/books/{bookId}/sessions
    @GetMapping
    public List<ReadingSessionResponse> findByBook(@PathVariable UUID bookId) {
        return readingSessionService.findByBook(bookId);
    }
}