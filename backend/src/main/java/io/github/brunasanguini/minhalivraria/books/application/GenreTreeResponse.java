package io.github.brunasanguini.minhalivraria.books.application;

import java.util.List;

/** A genre with its subgenres, both in name order. */
public record GenreTreeResponse(long id, String name, List<Subgenre> subgenres) {

    public record Subgenre(long id, String name) {}
}
