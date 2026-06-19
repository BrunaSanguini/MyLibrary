package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PublisherRequest(
        @NotBlank(message = "O nome da editora é obrigatório")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres")
        String name
) {}