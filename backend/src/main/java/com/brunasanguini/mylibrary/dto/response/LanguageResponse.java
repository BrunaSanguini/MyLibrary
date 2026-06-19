package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record LanguageResponse(
        UUID id,
        String name
) {}