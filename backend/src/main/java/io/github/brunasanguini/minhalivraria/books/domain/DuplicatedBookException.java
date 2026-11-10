package io.github.brunasanguini.minhalivraria.books.domain;

import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;

/**
 * The ISBN-13 or the Open Library edition already belongs to another book. The response carries {@code bookId}, so
 * the front-end can offer to open the book that is already in the collection (docs/erros.md).
 */
public class DuplicatedBookException extends ConflictException {

    public DuplicatedBookException(String code, long bookId) {
        super(code);
        addExtension("bookId", bookId);
    }
}
