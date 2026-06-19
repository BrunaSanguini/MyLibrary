package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LanguageRequest(
        @NotBlank(message = "O nome do idioma é obrigatório")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres")
        String name
) {}