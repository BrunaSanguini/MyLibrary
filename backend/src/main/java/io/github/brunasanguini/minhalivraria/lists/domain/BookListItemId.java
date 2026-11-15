package io.github.brunasanguini.minhalivraria.lists.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

/** A book appears at most once in a list, so the pair is the key. */
@Embeddable
public record BookListItemId(
        @Column(name = "book_list_id") long bookListId, @Column(name = "book_id") long bookId)
        implements Serializable {}
