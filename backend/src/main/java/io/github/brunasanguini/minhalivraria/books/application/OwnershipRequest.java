package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import jakarta.validation.constraints.NotNull;

/** Body of {@code PUT /books/{id}/ownership}: the tag shown on the book page. */
public record OwnershipRequest(@NotNull Ownership ownership) {}
