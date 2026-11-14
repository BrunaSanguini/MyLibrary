package io.github.brunasanguini.minhalivraria.books.application;

import java.util.List;

/** A publisher, with the book count and up to three covers for the Catálogos card. */
public record PublisherResponse(long id, String name, long bookCount, List<String> coverUrls) {

    public PublisherResponse(long id, String name) {
        this(id, name, 0, List.of());
    }
}
