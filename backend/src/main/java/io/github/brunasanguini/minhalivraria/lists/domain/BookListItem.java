package io.github.brunasanguini.minhalivraria.lists.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/** A book in a list, with the position the user gave it. The book belongs to another module: only its id. */
@Entity
@Table(name = "book_list_item")
public class BookListItem {

    @EmbeddedId
    private BookListItemId id;

    @Column(name = "item_order", nullable = false)
    private int itemOrder;

    @Column(name = "added_at", nullable = false, updatable = false)
    private Instant addedAt;

    public BookListItem(long bookListId, long bookId, int itemOrder, Instant addedAt) {
        this.id = new BookListItemId(bookListId, bookId);
        this.itemOrder = itemOrder;
        this.addedAt = addedAt;
    }

    /** For JPA only. */
    @SuppressWarnings("NullAway.Init")
    protected BookListItem() {}

    public void moveTo(int itemOrder) {
        this.itemOrder = itemOrder;
    }

    public long bookListId() {
        return id.bookListId();
    }

    public long bookId() {
        return id.bookId();
    }

    public int itemOrder() {
        return itemOrder;
    }

    public Instant addedAt() {
        return addedAt;
    }
}
