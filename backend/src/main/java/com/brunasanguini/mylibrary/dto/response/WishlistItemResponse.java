package com.brunasanguini.mylibrary.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record WishlistItemResponse(
        UUID id,
        UUID bookId,
        String bookTitle,
        Integer priority,
        BigDecimal targetPrice
) {}