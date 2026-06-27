package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.IsbnResponse;
import com.brunasanguini.mylibrary.service.IsbnService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/isbn")
public class IsbnController {

    private final IsbnService isbnService;

    public IsbnController(IsbnService isbnService) {
        this.isbnService = isbnService;
    }

    // GET /api/isbn/9788535914757
    @GetMapping("/{isbn}")
    public IsbnResponse fetchByIsbn(@PathVariable String isbn) {
        return isbnService.fetchByIsbn(isbn);
    }
}