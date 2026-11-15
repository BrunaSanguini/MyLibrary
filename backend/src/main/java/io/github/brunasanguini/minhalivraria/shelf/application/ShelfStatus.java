package io.github.brunasanguini.minhalivraria.shelf.application;

/**
 * Where a book stands on the shelf, calculated from its readings (docs/modelo-de-dados.md): reading when one is in
 * progress; otherwise what the latest reading says; want to read when there is none.
 */
public enum ShelfStatus {
    WANT_TO_READ,
    READING,
    READ,
    ABANDONED
}
