package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record GenreRequest(
        @NotBlank(message = "O nome do gênero é obrigatório")
        @Size(max = 100, message = "O nome deve ter no máximo 100 caracteres")
        String name,

        UUID parentId  // null = gênero pai, preenchido = subgênero (RN-061)
) {}