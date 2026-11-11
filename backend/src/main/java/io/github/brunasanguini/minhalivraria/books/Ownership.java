package io.github.brunasanguini.minhalivraria.books;

/** Whether the book is on the shelf, on the wish list, or only registered (docs/modelo-de-dados.md). */
public enum Ownership {
    /** "Tenho": the book is in the collection. */
    OWNED,
    /** On the wish list. */
    WISHLIST,
    /** Registered without telling whether it is owned. */
    NONE
}
