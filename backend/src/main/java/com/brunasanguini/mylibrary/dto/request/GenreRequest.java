package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GenreRequest(
        @NotBlank(message = "O nome do gênero é obrigatório")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres")
        String name
) {
}
