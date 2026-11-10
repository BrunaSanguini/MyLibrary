package io.github.brunasanguini.minhalivraria.books.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

@Entity
public class Series extends NamedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    /** For the "2 of 3" bar; unknown for open series. */
    @Column(name = "total_volumes")
    private @Nullable Integer totalVolumes;

    public Series(String name, @Nullable Integer totalVolumes) {
        super(name);
        this.totalVolumes = totalVolumes;
    }

    /** For JPA only. */
    protected Series() {}

    public void update(String name, @Nullable Integer totalVolumes) {
        rename(name);
        this.totalVolumes = totalVolumes;
    }

    public long id() {
        return Objects.requireNonNull(id, "Series not saved yet");
    }

    public @Nullable Integer totalVolumes() {
        return totalVolumes;
    }
}
