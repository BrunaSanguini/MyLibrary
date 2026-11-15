package io.github.brunasanguini.minhalivraria.books.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** Two authors may share a name; the Open Library key, when known, tells them apart. */
@Entity
public class Author extends NamedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(name = "ol_author_key", length = 32)
    private @Nullable String olAuthorKey;

    public Author(String name) {
        super(name);
    }

    /** An author that came with an imported book. */
    public Author(String name, @Nullable String olAuthorKey) {
        super(name);
        this.olAuthorKey = olAuthorKey;
    }

    /** Remembers who the author is at the Open Library, so the next import finds them even after a rename. */
    public void linkToOpenLibrary(String olAuthorKey) {
        this.olAuthorKey = olAuthorKey;
    }

    /** For JPA only. */
    protected Author() {}

    public long id() {
        return Objects.requireNonNull(id, "Author not saved yet");
    }

    public @Nullable String olAuthorKey() {
        return olAuthorKey;
    }
}
