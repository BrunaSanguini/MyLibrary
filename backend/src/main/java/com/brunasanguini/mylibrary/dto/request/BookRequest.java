package com.brunasanguini.mylibrary.dto;

import com.brunasanguini.mylibrary.entity.ReadingStatus;
import jakarta.validation.constraints.*;

import java.util.Set;
import java.util.UUID;

public record BookRequest(

        @NotBlank(message = "O título é obrigatório")
        @Size(max = 500, message = "O título deve ter no máximo 500 caracteres")
        String title,

        @NotEmpty(message = "Pelo menos um autor é obrigatório")  // RN-011
        Set<UUID> authorIds,

        @Size(max = 13, message = "ISBN deve ter no máximo 13 caracteres")
        String isbn,

        @Positive(message = "O número de páginas deve ser positivo")  // RN-018
        Integer pageCount,

        @NotBlank(message = "O idioma é obrigatório")  // RN-016
        String language,

        String synopsis,

        String coverUrl,

        Integer publicationYear,

        Set<UUID> genreIds,

        UUID publisherId,

        UUID seriesId,

        @Positive(message = "O número do volume deve ser positivo")  // RN-021
        Integer volumeNumber,

        Set<String> tags,

        ReadingStatus readingStatus,

        Boolean wouldReread,

        Boolean wouldRecommend,

        Boolean isFavorite,

        String review
) {}