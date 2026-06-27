package com.brunasanguini.mylibrary.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ReadingSessionResponse(
        UUID id,
        UUID bookId,
        String bookTitle,
        LocalDate startDate,
        LocalDate endDate,
        Long daysToRead,
        Integer rereadNumber,
        Boolean isCompleted,
        LocalDateTime createdAt
) {}