package io.github.brunasanguini.minhalivraria.books.domain;

import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * One of the books featured on the Home, in the slot it takes (1 to 3). The image is the one the user sent for the
 * slot, shown behind the book; changing the book of the slot keeps it.
 */
@Entity
@Table(name = "featured_book")
public class FeaturedBook extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(nullable = false)
    private short slot;

    @Column(name = "book_id", nullable = false)
    private long bookId;

    @Column(name = "image_id")
    private @Nullable Long imageId;

    public FeaturedBook(int slot, long bookId, @Nullable Long imageId) {
        this.slot = (short) slot;
        this.bookId = bookId;
        this.imageId = imageId;
    }

    /** For JPA only. */
    protected FeaturedBook() {}

    /** @return the image that was there, which the caller discards */
    public @Nullable Long replaceImage(@Nullable Long imageId) {
        Long previous = this.imageId;
        this.imageId = imageId;
        return previous;
    }

    public long id() {
        return Objects.requireNonNull(id, "Featured book not saved yet");
    }

    public int slot() {
        return slot;
    }

    public long bookId() {
        return bookId;
    }

    public @Nullable Long imageId() {
        return imageId;
    }
}
