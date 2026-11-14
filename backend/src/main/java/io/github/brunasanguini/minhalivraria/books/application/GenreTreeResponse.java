package io.github.brunasanguini.minhalivraria.books.application;

import java.util.List;

/**
 * A genre with its subgenres, both in name order. The {@code bookCount} of a genre counts the distinct books of the
 * genre and of its subgenres.
 */
public record GenreTreeResponse(long id, String name, long bookCount, List<Subgenre> subgenres) {

    public GenreTreeResponse(long id, String name, List<Subgenre> subgenres) {
        this(id, name, 0, subgenres);
    }

    public record Subgenre(long id, String name, long bookCount) {

        public Subgenre(long id, String name) {
            this(id, name, 0);
        }
    }
}
