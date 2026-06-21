package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.WishlistItemRequest;
import com.brunasanguini.mylibrary.dto.response.WishlistItemResponse;
import com.brunasanguini.mylibrary.service.WishlistItemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wishlist-items")
public class WishlistItemController {

    private final WishlistItemService wishlistItemService;

    public WishlistItemController(WishlistItemService wishlistItemService) {
        this.wishlistItemService = wishlistItemService;
    }

    @GetMapping
    public List<WishlistItemResponse> findAll() {
        return wishlistItemService.findAll();
    }

    @GetMapping("/{id}")
    public WishlistItemResponse findById(@PathVariable UUID id) {
        return wishlistItemService.findById(id);
    }

    @PostMapping
    public ResponseEntity<WishlistItemResponse> create(@Valid @RequestBody WishlistItemRequest request) {
        WishlistItemResponse created = wishlistItemService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }


    @PutMapping("/{id}")
    public WishlistItemResponse update(@PathVariable UUID id, @Valid @RequestBody WishlistItemRequest request) {
        return wishlistItemService.update(id, request);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        wishlistItemService.delete(id);
        return ResponseEntity.noContent().build();
    }
}