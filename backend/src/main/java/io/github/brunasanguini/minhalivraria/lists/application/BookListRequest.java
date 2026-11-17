package io.github.brunasanguini.minhalivraria.lists.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

public record BookListRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 1000) @Nullable String description) {}
