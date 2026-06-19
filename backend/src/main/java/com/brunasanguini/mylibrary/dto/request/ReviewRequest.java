package com.brunasanguini.mylibrary.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ReviewRequest(
        @NotNull(message = "O livro é obrigatório")
        UUID bookId,

        @Size(max = 20000, message = "A resenha deve ter no máximo 20000 caracteres")
        String content,

        Boolean wouldReread,
        Boolean wouldRecommend,
        Boolean isFavorite
) {}