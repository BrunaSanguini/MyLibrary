package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record RatingResponse(
        UUID id,
        UUID dimensionId,
        String dimensionName,
        Double score
) {}