package com.brunasanguini.mylibrary.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record RatingResponse(
        UUID id,
        UUID bookId,
        UUID dimensionId,
        String dimensionName,
        BigDecimal score
) {}