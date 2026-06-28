package com.brunasanguini.mylibrary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record DimensionRequest(
        @NotBlank(message = "O nome da dimensão é obrigatório")
        @Size(max = 100)
        String name,

        String description,

        UUID genreId  // null = universal
) {}