package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record BookRequest(
        @NotBlank(message = "O título é obrigatório")
        @Size(max = 500, message = "O título deve ter no máximo 500 caracteres")
        String title,

        String isbn,

        @Positive(message = "O número de páginas deve ser positivo")
        Integer pages,

        String coverUrl,

        @NotBlank(message = "O status de leitura é obrigatório")
        String status,

        UUID publisherId,
        UUID languageId,
        UUID seriesId,
        Integer volumeNumber,

        @NotNull(message = "É obrigatório informar pelo menos um autor")
        List<UUID> authorIds,

        List<UUID> genreIds,
        List<UUID> subgenreIds,
        List<UUID> tagIds
) {}