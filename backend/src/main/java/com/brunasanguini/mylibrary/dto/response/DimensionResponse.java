package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record DimensionResponse(
        UUID id,
        String name,
        String description,
        UUID genreId,
        String genreName
) {}