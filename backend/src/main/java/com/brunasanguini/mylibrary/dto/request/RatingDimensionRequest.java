package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record RatingDimensionRequest(
        @NotBlank(message = "O nome da dimensão é obrigatório")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres")
        String name,

        @Size(max = 5000, message = "A descrição deve ter no máximo 5000 caracteres")
        String description,

        UUID genreId,

        @NotNull(message = "É obrigatório informar se a dimensão é universal")
        Boolean isUniversal
) {}