package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record RatingDimensionResponse(
        UUID id,
        String name,
        String description,
        UUID genreId,
        String genreName,
        Boolean isUniversal
) {}