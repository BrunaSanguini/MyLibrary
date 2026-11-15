package io.github.brunasanguini.minhalivraria.shelf.application;

import java.util.List;

/**
 * @param series the other books of the same series, in the order of the series
 * @param similar up to 12 books that share subgenres with the book, the ones with more in common first
 */
public record RelatedBooksResponse(List<BookCardResponse> series, List<BookCardResponse> similar) {}
