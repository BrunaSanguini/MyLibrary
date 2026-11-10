package io.github.brunasanguini.minhalivraria.books.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

public record SeriesRequest(
        @NotBlank @Size(max = 200) String name,
        @Positive @Nullable Integer totalVolumes) {}
