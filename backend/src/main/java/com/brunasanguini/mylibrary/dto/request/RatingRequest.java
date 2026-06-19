package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record RatingRequest(
        @NotNull(message = "O livro é obrigatório")
        UUID bookId,

        @NotNull(message = "A dimensão é obrigatória")
        UUID dimensionId,

        @NotNull(message = "A nota é obrigatória")
        @DecimalMin(value = "0.0", message = "A nota mínima é 0")
        @DecimalMax(value = "10.0", message = "A nota máxima é 10")
        BigDecimal score
) {}