package io.github.brunasanguini.minhalivraria.reading.domain;

import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.math.BigDecimal;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** The rating and the review of a book: one per book, with at least one of the two filled in. */
@Entity
public class Review extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(name = "book_id", nullable = false, updatable = false)
    private long bookId;

    /** From 1 to 5, in half points. */
    @Column(precision = 2, scale = 1)
    private @Nullable BigDecimal rating;

    @Column(length = 20000)
    private @Nullable String content;

    /**
     * @throws BusinessRuleException {@code review.empty}, without rating and without text
     */
    public Review(long bookId, @Nullable BigDecimal rating, @Nullable String content) {
        this.bookId = bookId;
        rewrite(rating, content);
    }

    /** For JPA only. */
    protected Review() {}

    /**
     * @throws BusinessRuleException {@code review.empty}, without rating and without text
     */
    public void rewrite(@Nullable BigDecimal rating, @Nullable String content) {
        String text = content == null || content.isBlank() ? null : content.strip();
        if (rating == null && text == null) {
            throw new BusinessRuleException("review.empty");
        }
        this.rating = rating;
        this.content = text;
    }

    public long id() {
        return Objects.requireNonNull(id, "Review not saved yet");
    }

    public long bookId() {
        return bookId;
    }

    public @Nullable BigDecimal rating() {
        return rating;
    }

    public @Nullable String content() {
        return content;
    }
}
