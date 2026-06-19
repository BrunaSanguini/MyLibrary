package com.brunasanguini.mylibrary.dto.response;

import java.time.LocalDate;
import java.util.UUID;

public record AuthorResponse(
        UUID id,
        String name,
        String bio,
        LocalDate birthDate
) {
    public static class ErrorResponse {
    }
}