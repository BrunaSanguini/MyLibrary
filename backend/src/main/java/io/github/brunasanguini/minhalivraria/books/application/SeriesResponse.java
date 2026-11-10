package io.github.brunasanguini.minhalivraria.books.application;

import org.jspecify.annotations.Nullable;

public record SeriesResponse(long id, String name, @Nullable Integer totalVolumes) {}
