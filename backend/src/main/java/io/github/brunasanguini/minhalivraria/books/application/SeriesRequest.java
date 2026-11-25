package io.github.brunasanguini.minhalivraria.books.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * @param description written by the reader, for "Sobre a série"; blank is saved as none
 */
public record SeriesRequest(
        @NotBlank @Size(max = 200) String name,
        @Positive @Nullable Integer totalVolumes,
        @Size(max = 2000) @Nullable String description) {

    /** A series without description, as the form of a book creates it. */
    public SeriesRequest(String name, @Nullable Integer totalVolumes) {
        this(name, totalVolumes, null);
    }

    /** Blank text is no description. */
    public @Nullable String descriptionOrNull() {
        return description == null || description.isBlank() ? null : description.strip();
    }
}
