package io.github.brunasanguini.minhalivraria.lists.domain;

import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** A list of books, identified by its name. The normalized name is kept in sync on every change. */
@Entity
@Table(name = "book_list")
public class BookList extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "normalized_name", nullable = false, length = 120)
    private String normalizedName;

    @Column(length = 1000)
    private @Nullable String description;

    public BookList(String name, @Nullable String description) {
        this.name = name.strip();
        this.normalizedName = TextNormalizer.normalize(name);
        this.description = blankToNull(description);
    }

    /** For JPA only. */
    @SuppressWarnings("NullAway.Init")
    protected BookList() {}

    public void update(String name, @Nullable String description) {
        this.name = name.strip();
        this.normalizedName = TextNormalizer.normalize(name);
        this.description = blankToNull(description);
    }

    public long id() {
        return Objects.requireNonNull(id, "List not saved yet");
    }

    public String name() {
        return name;
    }

    public @Nullable String description() {
        return description;
    }

    private static @Nullable String blankToNull(@Nullable String text) {
        return text == null || text.isBlank() ? null : text.strip();
    }
}
