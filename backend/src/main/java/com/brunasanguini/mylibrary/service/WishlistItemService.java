package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.WishlistItemRequest;
import com.brunasanguini.mylibrary.dto.response.WishlistItemResponse;
import com.brunasanguini.mylibrary.entity.Book;
import com.brunasanguini.mylibrary.entity.WishlistItem;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.BookRepository;
import com.brunasanguini.mylibrary.repository.WishlistItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class WishlistItemService {

    private final WishlistItemRepository wishlistRepository;
    private final BookRepository bookRepository;

    public WishlistItemService(WishlistItemRepository wishlistRepository,
                               BookRepository bookRepository) {
        this.wishlistRepository = wishlistRepository;
        this.bookRepository = bookRepository;
    }

    public List<WishlistItemResponse> findAll() {
        return wishlistRepository.findAll().stream().map(this::toResponse).toList();
    }

    public WishlistItemResponse findById(UUID id) {
        WishlistItem item = wishlistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item da wish list não encontrado"));
        return toResponse(item);
    }

    public WishlistItemResponse create(WishlistItemRequest request) {
        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));

        WishlistItem item = new WishlistItem();
        item.setBook(book);
        item.setPriority(request.priority());
        item.setTargetPrice(request.targetPrice());
        return toResponse(wishlistRepository.save(item));
    }

    public WishlistItemResponse update(UUID id, WishlistItemRequest request) {
        WishlistItem item = wishlistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item da wish list não encontrado"));
        Book book = bookRepository.findById(request.bookId())
                .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado"));

        item.setBook(book);
        item.setPriority(request.priority());
        item.setTargetPrice(request.targetPrice());
        return toResponse(wishlistRepository.save(item));
    }

    public void delete(UUID id) {
        wishlistRepository.deleteById(id);
    }

    private WishlistItemResponse toResponse(WishlistItem item) {
        return new WishlistItemResponse(
                item.getId(),
                item.getBook().getId(),
                item.getBook().getTitle(),
                item.getPriority(),
                item.getTargetPrice()
        );
    }
}