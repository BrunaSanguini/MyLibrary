package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;
import java.util.UUID;

public record ReadingSessionRequest(
        @NotNull(message = "O livro é obrigatório")
        UUID bookId,

        @NotNull(message = "A data de início é obrigatória")
        LocalDate startDate,

        LocalDate endDate,

        @Positive(message = "O número de páginas lidas deve ser positivo")
        Integer pagesRead
) {}