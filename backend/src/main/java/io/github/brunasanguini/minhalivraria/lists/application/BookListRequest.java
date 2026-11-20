package io.github.brunasanguini.minhalivraria.lists.application;

import io.github.brunasanguini.minhalivraria.lists.domain.ListColor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * Creates or edits a list.
 *
 * @param color on creation, plum when it is not given; on an update, the list keeps the one it has
 */
public record BookListRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 1000) @Nullable String description,
        @Nullable ListColor color) {}
