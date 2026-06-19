package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.UUID;

public record WishlistItemRequest(
        @NotNull(message = "O livro é obrigatório")
        UUID bookId,

        @Positive(message = "A prioridade deve ser um número positivo")
        Integer priority,

        @PositiveOrZero(message = "O preço-alvo não pode ser negativo")
        BigDecimal targetPrice
) {}