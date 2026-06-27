package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record PublisherResponse(
        UUID id,
        String name,
        String country
) {}