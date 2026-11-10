package io.github.brunasanguini.minhalivraria.books.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

@Entity
public class Publisher extends NamedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    public Publisher(String name) {
        super(name);
    }

    /** For JPA only. */
    protected Publisher() {}

    public long id() {
        return Objects.requireNonNull(id, "Publisher not saved yet");
    }
}
