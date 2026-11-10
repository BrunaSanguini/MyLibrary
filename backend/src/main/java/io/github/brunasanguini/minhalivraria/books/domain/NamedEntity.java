package io.github.brunasanguini.minhalivraria.books.domain;

import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;

/** A catalog entry identified by its name. The normalized name is kept in sync on every change. */
@MappedSuperclass
public abstract class NamedEntity extends AuditedEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "normalized_name", nullable = false)
    private String normalizedName;

    protected NamedEntity(String name) {
        this.name = name.strip();
        this.normalizedName = TextNormalizer.normalize(name);
    }

    /** For JPA only. */
    @SuppressWarnings("NullAway.Init")
    protected NamedEntity() {}

    public void rename(String name) {
        this.name = name.strip();
        this.normalizedName = TextNormalizer.normalize(name);
    }

    public String name() {
        return name;
    }

    public String normalizedName() {
        return normalizedName;
    }
}
