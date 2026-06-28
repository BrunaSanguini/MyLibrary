package com.brunasanguini.mylibrary.dto.response;

import java.time.OffsetDateTime;
import java.util.Map;

public record ErrorResponse(
        int status,
        String message,
        String detail,
        Map<String, String> validationErrors
) {
    // Adiciona timestamp automático
    public OffsetDateTime timestamp() {
        return OffsetDateTime.now();
    }
}