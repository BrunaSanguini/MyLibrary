package io.github.brunasanguini.minhalivraria.books.domain;

import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/** A genre (no parent) or a subgenre (its parent is a genre). There are at most two levels. */
@Entity
public class Genre extends NamedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private @Nullable Genre parent;

    public Genre(String name, @Nullable Genre parent) {
        super(name);
        changeParent(parent);
    }

    /** For JPA only. */
    protected Genre() {}

    /**
     * Makes this genre a subgenre of {@code parent}, or a genre when {@code parent} is null.
     *
     * @throws BusinessRuleException {@code genre.invalid-parent} when the parent is itself a subgenre or this genre
     */
    public void changeParent(@Nullable Genre parent) {
        if (parent != null && (parent.isSubgenre() || parent == this)) {
            throw new BusinessRuleException("genre.invalid-parent");
        }
        this.parent = parent;
    }

    public boolean isSubgenre() {
        return parent != null;
    }

    public long id() {
        return Objects.requireNonNull(id, "Genre not saved yet");
    }

    public @Nullable Genre parent() {
        return parent;
    }

    public @Nullable Long parentId() {
        return parent == null ? null : parent.id();
    }
}
