package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SeriesRequest(
        @NotBlank(message = "O nome da série é obrigatório")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres")
        String name,

        @Positive(message = "O total de volumes deve ser positivo")
        Integer totalVolumes
) {}