package com.brunasanguini.mylibrary.dto.response;

import java.time.LocalDate;
import java.util.UUID;

public record ReadingSessionResponse(
        UUID id,
        UUID bookId,
        LocalDate startDate,
        LocalDate endDate,
        Integer pagesRead
) {}