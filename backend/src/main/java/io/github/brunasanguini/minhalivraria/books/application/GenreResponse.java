package io.github.brunasanguini.minhalivraria.books.application;

import org.jspecify.annotations.Nullable;

public record GenreResponse(long id, String name, @Nullable Long parentId) {}
