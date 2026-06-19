package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record SubgenreRequest(

        @NotBlank(message = "O nome do subgênero é obrigatório")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres")
        String name,

        @NotNull(message = "O gênero pai é obrigatório")
        UUID genreId
) {}