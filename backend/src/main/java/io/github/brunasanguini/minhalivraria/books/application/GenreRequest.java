package io.github.brunasanguini.minhalivraria.books.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/** {@code parentId} null creates a genre; a genre id creates a subgenre of it. */
public record GenreRequest(@NotBlank @Size(max = 100) String name, @Nullable Long parentId) {}
