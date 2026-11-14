package io.github.brunasanguini.minhalivraria.books.application;

import java.util.List;

/**
 * An author, with what the Catálogos card shows: how many books and up to three of their covers.
 */
public record AuthorResponse(long id, String name, long bookCount, List<String> coverUrls) {

    /** An author that has just been created has no books yet. */
    public AuthorResponse(long id, String name) {
        this(id, name, 0, List.of());
    }
}
